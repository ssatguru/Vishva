### 4/27/2025 0.4.0-alpha.11
- fixed issue of dialog box spilling out of canvas when its content height exceed the canvas height
- when switching avatar and the new avatar root is not a mesh throws a error and prevents switching
- if avatar mesh has one or more children then instead of just making the mesh unpickable make all chilren unpickable too
### 4/26/2025 0.4.0-alpha.10
- fixed issue of dialog box spilling out of canvas when it is restored after minimizing and moving it around
- fixed SNA ActuatorTextBar. Text would become transparent when the background was skybox
### 4/25/2025 0.4.0-alpha.9
- fixed universal camera not becoming active due to ambient occlusion issue
- added keys q and e to move universal camera up and down
- added option to disable shadow and serilizing that option during save
- upgraded to bablonjs version 8.4
### 4/24/2025 0.4.0-alpha.8
- added ambient occlusion
- fixed hemisphere light orientation
### 4/19/2025 0.4.0-alpha.7
- updated babylonjs to 8.x version
### 4/13/2025 0.4.0-alpha.5
- added new actuator SignalEmitter
- refactored actuators
### 9/13/2023 0.4.0-alpha.4
- added two depth renderer for each of the arc and uni cameras. previous fix for unicam not moving when Cascade shadow map used no longer required
### 9/13/2023 0.4.0-alpha.3
- fix issue of not picking up shadowgenerator when loading saved scene
- added two depth renderer for each of the arc and uni cameras. previous fix for unicam not moving when Cascade shadow map used no longer required
### 9/13/2023 0.4.0-alpha.2
- fix issue of unicam not moving when Cascade shadow map used
- fix issue of not picking up shadowgenerator when loading saved scene
- unicam speed increases when shft key is pressed
### 9/13/2023 0.4.0-alpha.1
- azimuth and elevation algorithm changed 
### 9/12/2023 0.4.0-alpha.0 
- light direction now set using azimuth and elevation
- shadows now generated using CascadedShadowGenerator

