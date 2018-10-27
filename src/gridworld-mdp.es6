// let product = require('cartesian-product');
// let range = require('lodash.range');
import range from 'lodash/range';
import map from 'lodash/map';
import fromPairs from 'lodash/frompairs';
import get from 'lodash/get';
import includes from 'lodash/includes';
const _ = {range, map, fromPairs, get, includes};
import product from 'cartesian-product';

export class GridWorldMDP {
    constructor ({
        feature_array,
        init_state,
        absorbing_states = [],
        feature_rewards = {},
        step_cost = 0,

        include_wait = false
    }) {
        this.height = feature_array.length;
        this.width = feature_array[0].length;

        this.states = product([range(this.width), range(this.height)]);
        this.statetypes = _.map(this.states, (s) => {
            let [x, y] = s;
            return [s, feature_array[this.height - y - 1][x]]
        });
        this.statetypes = _.fromPairs(this.statetypes);
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
        this.step_cost = step_cost;
    }

    transition ({state, action}) {
        if (typeof(state) === 'string') {
            state = _.map(state.split(","), parseInt);
        }
        let [x, y] = state;
        if (action === '^' && y < this.height-1) {
            y += 1;
        }
        else if (action === 'v' && y > 0) {
            y -= 1;
        }
        else if (action === '<' && x > 0) {
            x -= 1;
        }
        else if (action === '>' && x < this.width-1) {
            x += 1;
        }
        return [x, y]
    }

    reward ({
        state,
        action,
        nextstate
    }) {
        let ns_type = _.get(this.statetypes, nextstate);
        let r = _.get(this.feature_rewards, ns_type, 0);
        r += this.step_cost;
        return r
    }

    is_absorbing(state) {
        state = String(state);
        return _.includes(this.absorbing_states, state);
    }
}