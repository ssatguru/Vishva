import { ItemListUI } from "../gui/ItemListUI";
import { VishvaGUI } from "../gui/VishvaGUI";
import { Vishva } from "../Vishva";
import { VEvent } from "./VEvent";


export class EventManager {
        public static publish(event: string): void {
                switch (event) {
                        case (VEvent._ITEM_ADDED_TO_WORLD): {
                                let _itemListUI: ItemListUI = Vishva.vishva.vishvaGUI.getItemList()
                                if (_itemListUI != null) {
                                        _itemListUI.onItemAdded();
                                }
                        }

                }

        }
}