import { ItemListUI } from "../gui/ItemListUI";
import { VishvaGUI } from "../gui/VishvaGUI";
import { Vishva } from "../Vishva";
import { VEvent } from "./VEvent";


export class EventManager {

        //for each event this map holds the functions that should be executed when that event happens
        private static eventMap: Object = {};

        public static publish(event: string): void {
                let funcs: (() => void)[] = EventManager.eventMap[event];
                if (funcs === undefined) return;
                for (let func of funcs) {
                        func();
                }
        }

        public static subscribe(event: string, func: () => void) {
                if (EventManager.eventMap[event] === undefined)
                        EventManager.eventMap[event] = new Array();

                EventManager.eventMap[event].push(func);

        }
}