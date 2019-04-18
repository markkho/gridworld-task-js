// let product = require('cartesian-product');
// let range = require('lodash.range');
import range from 'lodash/range';
import map from 'lodash/map';
import fromPairs from 'lodash/frompairs';
import get from 'lodash/get';
import includes from 'lodash/includes';
import keys from 'lodash/keys';
import weighted from 'weighted';
const _ = {range, map, fromPairs, get, includes, keys};
import product from 'cartesian-product';

let rot90 = function(v, n) {
    n = typeof(n) === 'undefined' ? 1 : n;
    for (let i = 0; i < n+1; i++) {
        v = [-v[1], v[0]]
    }
    return v
};

let ACTION_CODES = {
    '>': [1, 0],
    '<': [-1,0],
    'v': [0,-1],
    '^': [0, 1],
    'x': [0, 0]
};

export class GridWorldMDP {
    constructor ({
        feature_array,
        init_state,
        absorbing_states = [],
        feature_rewards = {},
        feature_transitions = {
            'j': {
                '2forward': 1.0
            }
        },
        wall_feature = "#",
        step_cost = 0,

        include_wait = false
    }) {
        this.height = feature_array.length;
        this.width = feature_array[0].length;

        this.states = product([range(this.width), range(this.height)]);
        this.walls = [];
        this.state_features = _.map(this.states, (s) => {
            let [x, y] = s;
            let f = feature_array[this.height - y - 1][x];
            if (f === wall_feature) {
                this.walls.push(s);
            }
            return [s, f]
        });
        this.state_features = _.fromPairs(this.state_features);
        this.absorbing_states = _.map(absorbing_states, String);
        this.include_wait = include_wait;
        if (include_wait) {
			this.actions = ['^', 'v', '<', '>', 'x'];
		}
		else {
			this.actions = ['^', 'v', '<', '>'];
		}
		this.terminal_state = [-1, -1];

        this.feature_rewards = feature_rewards;
        this.feature_transitions = feature_transitions;
        this.step_cost = step_cost;
        this.wall_feature = wall_feature;
    }

    is_wall(state) {
        return this.state_features[state] === this.wall_feature
    }

    on_grid(s) {
        return [
            Math.max(Math.min(s[0], this.width-1), 0),
            Math.max(Math.min(s[1], this.height-1), 0)
        ]
    }

    get_typed_transition_func(name) {
        return {
            '2forward': (s, a) => {
                let ns0 = this.on_grid([s[0]+a[0], s[1]+a[1]]);
                let ns1 = this.on_grid([s[0]+a[0]*2, s[1]+a[1]*2]);
                if (this.is_wall(ns0)) {
                    return s
                }
                else if (this.is_wall(ns1)) {
                    return ns0
                }
                return ns1
            },
            'forward': (s, a) => {
                let ns = this.on_grid([s[0]+a[0], s[1]+a[1]]);
                if (this.is_wall(ns)) {
                    return s
                }
                return ns
            }
        }[name]
    }

    transition ({state, action}) {
        if (typeof(state) === 'string') {
            state = _.map(state.split(","), parseInt);
        }
        let [x, y] = state;
        action = ACTION_CODES[action];

        //non-standard transitions, otherwise default transition
        let ns;
        let f = this.state_features[state];
        let fs = _.keys(this.feature_transitions);
        if (_.includes(fs, f)) {
            let f_trans = weighted.select(this.feature_transitions[f]);
            ns = this.get_typed_transition_func(f_trans)(state, action)
        }
        else {
            ns = this.get_typed_transition_func('forward')(state, action)
        }
        return ns
    }

    reward ({
        state,
        action,
        nextstate
    }) {
        let ns_type = _.get(this.state_features, String(nextstate));
        let r = _.get(this.feature_rewards, ns_type, 0);
        r += this.step_cost;
        return r
    }

    is_absorbing(state) {
        state = String(state);
        return _.includes(this.absorbing_states, state);
    }
}