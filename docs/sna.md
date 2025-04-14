# Architecture and Implementation of Sensors and Actuators in Vishva

The **Sensors and Actuators** system in Vishva is designed to enable dynamic interactions within the 3D scene. Sensors detect specific events or conditions, while actuators respond to these events by performing actions. This system is modular and extensible, allowing developers to add new sensors and actuators as needed.

---

## Architecture

### Key Components

1. **SensorActuator Interface**
   - The base interface for all sensors and actuators.
   - Defines common methods and properties for both sensors and actuators.
   - Located in [`src/sna/SNA.ts`](src/sna/SNA.ts).

   ```ts
   export interface SensorActuator {
       start(signal: string): boolean;
       getName(): string;
       getType(): string;
       getProperties(): SNAproperties;
       setProperties(properties: SNAproperties);
       dispose();
   }
   ```

2. **Sensor Interface**
   - Extends [`SensorActuator`](src/sna/SNA.ts).
   - Represents a sensor that emits signals when specific conditions are met.
   - Example: A sensor that emits a signal when a mesh is clicked.

   ```ts
   export interface Sensor extends SensorActuator {
       emitSignal(e: ActionEvent);
   }
   ```

3. **Actuator Interface**
   - Extends [`SensorActuator`](src/sna/SNA.ts).
   - Represents an actuator that performs actions in response to signals.
   - Example: An actuator that rotates a mesh when triggered.

   ```ts
   export interface Actuator extends SensorActuator {
       stop();
       actuate();
       isReady(): boolean;
       processQueue();
       getMesh(): Mesh;
   }
   ```

4. **SNAManager**
   - Manages the lifecycle of sensors and actuators.
   - Provides methods to create, configure, and manage sensors and actuators.
   - Located in [`src/sna/SNA.ts`](src/sna/SNA.ts).

   ```ts
   public static getSNAManager(): SNAManager;
   public addSensor(name: string, sensor: any);
   public addActuator(name: string, actuator: any);
   public createSensorByName(name: string, mesh: Mesh, prop: SNAproperties): Sensor;
   public createActuatorByName(name: string, mesh: Mesh, prop: SNAproperties): Actuator;
   ```

5. **SNAproperties**
   - Represents the configuration properties for sensors and actuators.
   - Used to dynamically configure behavior.

---

## Implementation

### Sensors

1. **Sensor Creation**
   - Sensors are created using the [`SNAManager.createSensorByName`](src/sna/SNA.ts) method.
   - Example: Creating a sensor for detecting clicks on a mesh.

   ```ts
   let sensor = SNAManager.getSNAManager().createSensorByName("ClickSensor", mesh, properties);
   ```

2. **Signal Emission**
   - Sensors emit signals when their conditions are met.
   - Example: A `ClickSensor` emits a signal when the associated mesh is clicked.

   ```ts
   public emitSignal(e: ActionEvent) {
       // Emit signal logic
   }
   ```

3. **Disposal**
   - Sensors are disposed of when no longer needed to free resources.

   ```ts
   public dispose() {
       // Cleanup logic
   }
   ```

---

### Actuators

1. **Actuator Creation**
   - Actuators are created using the [`SNAManager.createActuatorByName`](src/sna/SNA.ts) method.
   - Example: Creating an actuator to rotate a mesh.

   ```ts
   let actuator = SNAManager.getSNAManager().createActuatorByName("Rotator", mesh, properties);
   ```

2. **Actuation**
   - Actuators perform actions in response to signals.
   - Example: A `Rotator` actuator rotates a mesh when triggered.

   ```ts
   public actuate() {
       // Actuation logic
   }
   ```

3. **Disposal**
   - Actuators are disposed of when no longer needed.

   ```ts
   public dispose() {
       // Cleanup logic
   }
   ```

---

### Integration with Vishva

1. **Sensor and Actuator Management**
   - The [`Vishva`](src/Vishva.ts) class integrates sensors and actuators into the scene.
   - Provides methods to add, remove, and retrieve sensors and actuators.

   ```ts
   public addSensorbyName(sensName: string): Sensor;
   public addActuaorByName(actName: string): Actuator;
   public removeSensor(index: number): string;
   public removeActuator(index: number): string;
   ```

2. **UI Integration**
   - The [`SnaUI`](src/gui/SnaUI.ts) class provides a user interface for managing sensors and actuators.
   - Allows users to add, edit, and remove sensors and actuators dynamically.
   - Located in [`src/gui/SnaUI.ts`](src/gui/SnaUI.ts).

   ```ts
   private showEditSensDiag(sensor: Sensor);
   private updateSensActTbl(sensAct: Array<SensorActuator>, tbl: HTMLTableElement);
   ```

---

### Example Workflow

1. **Adding a Sensor**
   - A user selects a mesh and adds a sensor (e.g., `ClickSensor`) via the UI.
   - The sensor is created and attached to the mesh.

2. **Adding an Actuator**
   - A user selects a mesh and adds an actuator (e.g., `Rotator`) via the UI.
   - The actuator is created and attached to the mesh.

3. **Signal Emission and Actuation**
   - When the sensor detects a condition (e.g., a click), it emits a signal.
   - The actuator listens for the signal and performs the corresponding action (e.g., rotating the mesh).

---

### Extensibility

1. **Adding New Sensors**
   - Implement the [`Sensor`](src/sna/SNA.ts) interface.
   - Register the new sensor with [`SNAManager.addSensor`](src/sna/SNA.ts).

2. **Adding New Actuators**
   - Implement the [`Actuator`](src/sna/SNA.ts) interface.
   - Register the new actuator with [`SNAManager.addActuator`](src/sna/SNA.ts).

---

This architecture provides a flexible and modular system for creating interactive 3D scenes in Vishva.