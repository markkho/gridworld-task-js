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
        endtask_callback = () => {},
        annotations = [],

        OBJECT_ANIMATION_TIME = 200,
        REWARD_ANIMATION_TIME = 800,
        disable_during_movement = true,
        disable_hold_key = true,
        WALL_WIDTH = .08,
        TILE_SIZE = 100,
        INTENTIONAL_ACTION_TIME_PROP = .4,
        DELAY_TO_REACTIVATE_UI = .8,
        END_OF_ROUND_DELAY_MULTIPLIER = 4
    }) {
        this.container = container;
        this.step_callback = step_callback;
        this.endtask_callback = endtask_callback;
        this.annotations = annotations;

        this.painter_config = {
            OBJECT_ANIMATION_TIME,
            WALL_WIDTH,
            TILE_SIZE
        };

        this.disable_during_movement = disable_during_movement;
        this.INTENTIONAL_ACTION_TIME_PROP = INTENTIONAL_ACTION_TIME_PROP;
        this.DELAY_TO_REACTIVATE_UI = DELAY_TO_REACTIVATE_UI;
        this.END_OF_ROUND_DELAY_MULTIPLIER = END_OF_ROUND_DELAY_MULTIPLIER;
        this.REWARD_ANIMATION_TIME = REWARD_ANIMATION_TIME;
        this.TILE_SIZE = TILE_SIZE;
        this.disable_hold_key = disable_hold_key;
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
        feature_transitions = {},
        show_rewards = true
    }) {
        let task_params = arguments[0];
        this.mdp = new GridWorldMDP(task_params);

        //initialize painter
        this.painter = new GridWorldPainter(
            this.mdp.width,
            this.mdp.height,
            this.container,
            this.painter_config
        );
        this.painter.initialize_paper();
        let tile_params = _.fromPairs(_.map(this.mdp.state_features, (f, s) => {
            return [s, {fill: feature_colors[f]}]
        }));
        this.painter.draw_tiles(tile_params);

        this.painter.draw_walls(walls);

        if (typeof(init_state) !== 'undefined') {
            this.painter.add_object("circle", "agent", {"fill" : "blue"});
            this.painter.draw_object(init_state[0], init_state[1], undefined, "agent");
            this.state = init_state;
        }

        this.annotations.forEach((annotation_params) => {
            let annotation = this.painter.add_text(annotation_params);
            this.annotations.push(annotation);
        });
        this.show_rewards = show_rewards;
        this.task_ended = false;
    }

    start() {
        this.start_datetime = +new Date;
        this._enable_response();
    }

    end_task() {
        //Interface for client to set end task flag
        this.task_ended = true;
    }

    reset() {
        this._disable_response();
        this.painter.clear_objects();
        this.painter.draw_tiles();
    }

    _enable_response() {
        $(document).on("keydown.task_response", (e) => {
            let kc = e.keyCode ? e.keyCode : e.which;
            let action;
            if (kc === 37) {
                action = "<";
            }
            else if (kc === 38) {
                action = "^";
            }
            else if (kc === 39) {
                action = ">";
            }
            else if (kc === 40) {
                action = "v";
            }
            else if (kc === 32 && this.mdp.include_wait) {
                action = "x";
            }
            else {
                return
            }
            this.last_key_code = kc;
            if (this.disable_during_movement) {
                this._disable_response();
            }
            let step_data = this._update({action});
            this.step_callback(step_data);
        });
    }

    _disable_response() {
        $(document).off("keydown.task_response");
    }

    _do_animation({reward, action, nextstate}) {
        let r_params = {
            fill: reward < 0 ? 'red' : 'yellow',
            'stroke-width': 1.5,
            stroke: reward < 0 ? 'white' : 'black',
            "font-size": this.TILE_SIZE/2
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
                this.painter.float_text(
                    nextstate[0],
                    nextstate[1],
                    r_string,
                    r_params,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    this.REWARD_ANIMATION_TIME
                );
            }, animtime)
        }
    }

    _end_task() {
        this._disable_response();
        setTimeout(() => {
            this.painter.hide_object("agent")
        }, animtime*(this.END_OF_ROUND_DELAY_MULTIPLIER - 1));
        setTimeout(() => {
            this.endtask_callback();
        }, animtime*this.END_OF_ROUND_DELAY_MULTIPLIER);
    }

    _setup_trial() {
        let animtime = this.painter.OBJECT_ANIMATION_TIME;

        // Different conditions depending on pre-conditions
        // for next responses
        if (this.disable_during_movement) {
            if (this.disable_hold_key) {
                $(document).on("keyup.enable_resp", (e) => {
                    let kc = e.keyCode ? e.keyCode : e.which;
                    if (this.last_key_code !== kc) {
                        return
                    }
                    $(document).off("keyup.enable_resp");
                    this._key_unpressed = true;
                })
                setTimeout( () => {
                    console.log(this._key_unpressed);
                    if (!this._key_unpressed) {
                        $(document).off("keyup.enable_resp");
                        $(document).on("keyup.enable_resp", (e) => {
                            let kc = e.keyCode ? e.keyCode : e.which;
                            if (this.last_key_code !== kc) {
                                return
                            }
                            $(document).off("keyup.enable_resp");
                            this._enable_response();
                            this._key_unpressed = false;
                        });
                    }
                    else {
                        this._key_unpressed = false;
                        this._enable_response();
                    }

                    this.start_datetime = +new Date;
                }, animtime*this.DELAY_TO_REACTIVATE_UI);
            }
            else {
                setTimeout(() => {
                    this._enable_response();
                    this.start_datetime = +new Date;
                }, animtime*this.DELAY_TO_REACTIVATE_UI)
            }
        }
        else {
            console.warn("FEATURE NOT IMPLEMENTED!")
        }

    }

    _update({action}) {
        let response_datetime = +new Date;

        let state = this.state;
        let nextstate = this.mdp.transition({state, action});
        let reward = this.mdp.reward({state, action, nextstate});

        this._do_animation({reward, action, nextstate});

        if (this.mdp.is_absorbing(nextstate) || this.task_ended) {
            this._end_task();
        }
        else {
            this._setup_trial();
        }

        this.state = nextstate;
        return {
            state,
            state_type: this.mdp.state_features[state],
            action,
            nextstate,
            nextstate_type: this.mdp.state_features[nextstate],
            reward,
            start_datetime: this.start_datetime,
            response_datetime: response_datetime
        }
    }
}

if (typeof(window) === 'undefined') {
    module.exports = GridWorldTask;
}
else {
    window.GridWorldTask = GridWorldTask;
}