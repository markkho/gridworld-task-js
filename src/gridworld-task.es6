/**
 * Created by markho on 6/25/17.
 */
import $ from 'jquery';
import forOwn from 'lodash/forown';
import map from 'lodash/map';
import fromPairs from 'lodash/frompairs';
import includes from 'lodash/includes';
const _ = {forOwn, map, fromPairs, includes};
let GridWorldPainter = require("gridworld-painter");
import * as gwmdp from "./gridworld-mdp.es6";

let GridWorldMDP = gwmdp.GridWorldMDP;

class GridWorldTask {
    constructor({
        container,
        step_callback = (d) => {console.log(d)},
        absorbing_callback = () => {},
        annotations = [],

        OBJECT_ANIMATION_TIME = 200,
        disable_during_movement = true,
        WALL_WIDTH = .08,
        TILE_SIZE = 100,
        INTENTIONAL_ACTION_TIME_PROP = .4
    }) {
        this.container = container;
        this.step_callback = step_callback;
        this.absorbing_callback = absorbing_callback;
        this.annotations = annotations;

        this.painter_config = {
            OBJECT_ANIMATION_TIME,
            WALL_WIDTH,
            TILE_SIZE
        };

        this.disable_during_movement = disable_during_movement;
        this.INTENTIONAL_ACTION_TIME_PROP = INTENTIONAL_ACTION_TIME_PROP;
        this.DELAY_TO_REACTIVATE_UI = .8;
        this.END_OF_ROUND_DELAY_MULTIPLIER = 4;
    }

    init({
        feature_array,
        walls = [],
        init_state,
        absorbing_states,
        feature_rewards,
        step_cost,
        include_wait,

        feature_colors = {
            '.': 'white',
            'b': 'lightblue',
            'g': 'lightgreen',
            'r': 'red',
            'y': 'yellow',
            'c': 'chocolate'
        },
        show_rewards = true
    }) {
        let task_params = arguments[0];
        this.mdp = new GridWorldMDP(task_params);
        this.painter = new GridWorldPainter(
            this.mdp.width,
            this.mdp.height,
            this.container,
            this.painter_config
        );
        this.painter.initialize_paper();
        let tile_params = _.fromPairs(_.map(this.mdp.statetypes, (f, s) => {
            return [s, {fill: feature_colors[f]}]
        }));
        this.painter.draw_tiles(tile_params);

        this.painter.draw_walls(walls);

        this.painter.add_object("circle", "agent", {"fill" : "blue"});
        this.painter.draw_object(init_state[0], init_state[1], undefined, "agent");
        this.state = init_state;

        this.annotations.forEach((annotation_params) => {
            let annotation = this.painter.add_text(annotation_params);
            this.annotations.push(annotation);
        });
        this.show_rewards = show_rewards;
    }

    start() {
        this.enable_response();
    }

    enable_response() {
        $(document).on("keydown", (e) => {
            let kc = e.keyCode ? e.keyCode : e.which;
            let action;
            switch (kc) {
                case 37:
                    action = "<";
                    break;
                case 38:
                    action = '^';
                    break;
                case 39:
                    action = ">";
                    break;
                case 40:
                    action = "v";
                    break;
                default:
                    return
            }
            if (this.disable_during_movement) {
                $(document).off("keydown");
            }
            let step_data = this.update({action});
            this.step_callback(step_data);
        });
    }

    update({action}) {
        let datetime = +new Date;

        let state = this.state;
        let nextstate = this.mdp.transition({state, action});
        let reward = this.mdp.reward({state, action, nextstate});

        let r_params = {
            fill: reward < 0 ? 'red' : 'yellow',
            'stroke-width': 1,
            stroke: reward < 0 ? 'white' : 'black'
        };
        let r_string = reward < 0 ? String(reward) : "+" + reward;

        //animate things
        this.painter.animate_object_movement({
            action: action,
            new_x: nextstate[0],
            new_y: nextstate[1],
            object_id: 'agent'
        });
        let animtime = this.painter.OBJECT_ANIMATION_TIME;
        if (this.show_rewards && reward !== 0) {
            setTimeout(() => {
                this.painter.float_text({
                    x: nextstate[0],
                    y: nextstate[1],
                    text : r_string,
                    pre_params : r_params
                }, animtime*.9);
            })
        }

        //handle setting up next trial
        if (this.mdp.is_absorbing(nextstate)) {
            $(document).off("keydown");
            setTimeout(() => {
                this.painter.hide_object("agent")
            }, animtime*(this.END_OF_ROUND_DELAY_MULTIPLIER - 1));
            setTimeout(() => {
                this.absorbing_callback()
            }, animtime*this.END_OF_ROUND_DELAY_MULTIPLIER);
        }
        else if (this.disable_during_movement) {
            setTimeout(() => {
                this.enable_response();
            }, animtime*this.DELAY_TO_REACTIVATE_UI)
        }

        this.state = nextstate;
        return {
            state,
            action,
            nextstate,
            reward,
            datetime
        }
    }
}

if (typeof(window) === 'undefined') {
    module.exports = GridWorldTask;
}
else {
    window.GridWorldTask = GridWorldTask;
}