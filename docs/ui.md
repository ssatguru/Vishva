# Architecture and Implementation of the UI in Vishva

The **User Interface (UI)** in Vishva is designed to provide an intuitive and interactive way for users to manage and interact with the 3D scene. The UI allows users to add, edit, and remove sensors, actuators, and other scene elements dynamically. It is built using HTML, CSS, and JavaScript, integrated with BabylonJS for seamless interaction with the 3D environment.

---

## Architecture

### Key Components

1. **UI Framework**
   - The UI is built using standard web technologies:
     - **HTML**: For structuring the interface.
     - **CSS**: For styling and layout.
     - **JavaScript**: For dynamic behavior and interaction.
   - The [W3.CSS](https://www.w3schools.com/w3css/) framework is used for responsive design and consistent styling.

2. **UI Manager**
   - The `UIManager` class is responsible for managing the lifecycle of UI components.
   - Provides methods to initialize, update, and dispose of UI elements.
   - Located in [`src/gui/UIManager.ts`](src/gui/UIManager.ts).

   ```ts
   export class UIManager {
       public static initializeUI(): void;
       public static updateUI(): void;
       public static disposeUI(): void;
   }
   ```

3. **SnaUI**
   - The `SnaUI` class handles the UI for managing sensors and actuators.
   - Provides dialogs and tables for adding, editing, and removing sensors and actuators.
   - Located in [`src/gui/SnaUI.ts`](src/gui/SnaUI.ts).

   ```ts
   export class SnaUI {
       private showEditSensDiag(sensor: Sensor): void;
       private updateSensActTbl(sensAct: Array<SensorActuator>, tbl: HTMLTableElement): void;
   }
   ```

4. **Dialogs**
   - Dialogs are used for user input and configuration.
   - Example: A dialog for editing sensor properties.
   - Implemented using HTML modals styled with W3.CSS.

5. **Tables**
   - Tables are used to display lists of sensors, actuators, and other scene elements.
   - Example: A table showing all sensors attached to a selected mesh.

---

## Implementation

### UI Initialization

1. **HTML Structure**
   - The UI is defined in an HTML file, typically loaded as part of the application.
   - Example structure:

   ```html
   <div id="ui-container" class="w3-container">
       <div id="sensor-table" class="w3-table w3-bordered"></div>
       <div id="actuator-table" class="w3-table w3-bordered"></div>
   </div>
   ```

2. **CSS Styling**
   - W3.CSS is used for styling.
   - Example styles:

   ```css
   .w3-container {
       padding: 16px;
   }
   .w3-table {
       width: 100%;
   }
   ```

3. **JavaScript Initialization**
   - The `UIManager.initializeUI` method is called during application startup to set up the UI.

   ```ts
   UIManager.initializeUI();
   ```

---

### Sensor and Actuator Management

1. **Adding Sensors and Actuators**
   - The `SnaUI` class provides methods to add sensors and actuators via the UI.
   - Example: Adding a sensor.

   ```ts
   public addSensor(sensorName: string): void {
       // Logic to add a sensor
   }
   ```

2. **Editing Sensors and Actuators**
   - The `showEditSensDiag` method displays a dialog for editing sensor properties.

   ```ts
   private showEditSensDiag(sensor: Sensor): void {
       // Logic to show the edit dialog
   }
   ```

3. **Removing Sensors and Actuators**
   - Sensors and actuators can be removed via the UI by selecting them in a table and clicking a "Remove" button.

   ```ts
   public removeSensor(index: number): void {
       // Logic to remove a sensor
   }
   ```

---

### Event Handling

1. **User Input**
   - User actions (e.g., button clicks, table selections) are handled using event listeners.
   - Example: Handling a button click to add a sensor.

   ```ts
   document.getElementById("add-sensor-btn").addEventListener("click", () => {
       this.addSensor("ClickSensor");
   });
   ```

2. **Scene Interaction**
   - The UI interacts with the 3D scene via the `Vishva` class.
   - Example: Selecting a mesh in the scene updates the UI to show its sensors and actuators.

   ```ts
   public updateUIForSelectedMesh(mesh: Mesh): void {
       // Logic to update the UI
   }
   ```

---

### Example Workflow

1. **Adding a Sensor**
   - The user selects a mesh in the 3D scene.
   - The user clicks the "Add Sensor" button in the UI.
   - A dialog appears, allowing the user to configure the sensor.
   - The sensor is added to the mesh and displayed in the sensor table.

2. **Editing a Sensor**
   - The user selects a sensor in the table.
   - The user clicks the "Edit" button.
   - A dialog appears, allowing the user to modify the sensor's properties.
   - The changes are saved, and the table is updated.

3. **Removing a Sensor**
   - The user selects a sensor in the table.
   - The user clicks the "Remove" button.
   - The sensor is removed from the mesh and the table.

---

### Extensibility

1. **Adding New UI Components**
   - Create a new class or method in `UIManager` or `SnaUI`.
   - Define the HTML structure and event handlers for the new component.

2. **Customizing Styles**
   - Modify the W3.CSS styles or add custom CSS rules.

3. **Integrating New Features**
   - Extend the `Vishva` class to support new features.
   - Update the UI to interact with the new features.

---

This architecture ensures a clean separation of concerns, making the UI in Vishva easy to maintain and extend.