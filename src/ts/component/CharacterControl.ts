
namespace org.ssatguru.babylonjs.component {

    import Skeleton = BABYLON.Skeleton;
    import ArcRotateCamera = BABYLON.ArcRotateCamera;
    import Vector3 = BABYLON.Vector3;
    import Mesh = BABYLON.Mesh;
    import Scene = BABYLON.Scene;

    export class CharacterControl {

        avatarSkeleton: Skeleton;
        camera: ArcRotateCamera;
        avatar: Mesh;
        key: Key;
        scene: Scene;
        //slopeLimit in degrees
        slopeLimit: number = 30;
        //slopeLimit in radians
        sl: number = Math.PI * this.slopeLimit / 180;

        private renderer: () => void;

        constructor(avatar: Mesh, avatarSkeleton: Skeleton, anims: AnimData[], camera: ArcRotateCamera, scene: Scene) {

            this.avatarSkeleton = avatarSkeleton;
            if (anims !== null) this.initAnims(anims);
            this.camera = camera;

            this.avatar = avatar;
            this.scene = scene;
            this.key = new Key();

            window.addEventListener("keydown", (e) => {return this.onKeyDown(e)}, false);
            window.addEventListener("keyup", (e) => {return this.onKeyUp(e)}, false);
            this.renderer = () => {this.moveAVandCamera()};


        }



        public setAvatar(avatar: Mesh) {
            this.avatar = avatar;
        }

        public setAvatarSkeleton(avatarSkeleton: Skeleton) {
            this.avatarSkeleton = avatarSkeleton;
        }

        public setAnims(anims: AnimData[]) {
            this.initAnims(anims);
        }

        public setSlopeLimit(slopeLimit: number) {
            this.slopeLimit = slopeLimit;
            this.sl = Math.PI * slopeLimit / 180;
        }


        private started: boolean = false;

        public start() {
            if (this.started) return;
            this.started = true;
            this.key.reset();
            this.movFallTime = 0;
            //first time we enter render loop, delta time shows zero !!
            this.stillFallTime = 0.001;
            this.grounded = false;
            this.updateTargetValue();

            this.scene.registerBeforeRender(this.renderer);
            //this.scene.registerAfterRender(this.afterRenderer);
            this.scene
        }

        public stop() {
            if (!this.started) return;
            this.started = false;
            this.scene.unregisterBeforeRender(this.renderer);
        }

        private walk: AnimData;
        private walkBack: AnimData;
        private idle: AnimData;
        private run: AnimData;
        private jump: AnimData;
        private turnLeft: AnimData;
        private turnRight: AnimData;
        private strafeLeft: AnimData;
        private strafeRight: AnimData;

        private initAnims(anims: AnimData[]) {
            this.walk = anims[0];
            this.walkBack = anims[1];
            this.idle = anims[2];
            this.run = anims[3];
            this.jump = anims[4];
            this.turnLeft = anims[5];
            this.turnRight = anims[6];
            this.strafeLeft = anims[7];
            this.strafeRight = anims[8];
        }

        //avatar walking speed in meters/second
        private avatarSpeed: number = 3;
        private prevAnim: AnimData = null;

        private jumpCycleMax: number = 40;
        private jumpCycle: number = this.jumpCycleMax;
        private wasJumping: boolean = false;

        private gravity: number = 9.8 * 2;
        private avStartPos: Vector3 = new Vector3(0, 0, 0);
        private grounded: boolean = false;
        //distance by which AV would move down if in freefall
        private freeFallDist: number = 0;
        //for how long has the av been falling while moving
        private movFallTime: number = 0;
        //for how long has the av been falling while not moving
        private stillFallTime: number = 0;
        //how many minimum contiguos frames should the AV have been in free fall
        //before we assume AV is really in freefall.
        //we will use this to remove animation flicker (fall, no fall, fall etc)
        private fallFrameCountMin: number = 10;
        private fallFrameCount: number = 0;
        
        private inAir: boolean = false;
        private moveVector: Vector3 = new Vector3(0, 0, 0);

        public moveAVandCamera(): boolean {
            this.avStartPos.copyFrom(this.avatar.position);

            let anim: AnimData = null;
            let noMoveKeyPressed: boolean = !this.anyMovement();
            //skip everything if no movement key pressed
            if (this.inAir || noMoveKeyPressed) {
               
                this.fallFrameCount = 0;
                if (!this.grounded) {
                     anim = this.idle;
                    let dt: number = this.scene.getEngine().getDeltaTime() / 1000;
                    if (dt === 0) {
                        this.freeFallDist = 5;
                    } else {
                        this.stillFallTime = this.stillFallTime + dt;
                        let u: number = this.stillFallTime * this.gravity
                        this.freeFallDist = u * dt + this.gravity * dt * dt / 2;
                    }
                    this.moveVector.copyFromFloats(0, -this.freeFallDist, 0);
                    this.avatar.moveWithCollisions(this.moveVector);
                    if (this.avStartPos.y === this.avatar.position.y) {
                        this.grounded = true;
                        this.inAir = false;
                        this.stillFallTime = 0;
                    } else if (this.avatar.position.y < this.avStartPos.y) {
                        //AV is going down. 
                        //Check if AV is fallling down or is on a slope
                        //if the actual distance travelled down is same as what AV would have travelled if in freefall
                        //then AV is in freefall else AV is on a slope
                        let ht: number = this.avStartPos.y - this.avatar.position.y;
                        let delta: number = Math.abs(this.freeFallDist - ht);
                        if (delta < 0.0001) {
                            if (this.stillFallTime > dt) anim = this.jump;
                        } else {
                            let diff: number = this.avStartPos.subtract(this.avatar.position).length();
                            let slope: number = Math.asin(ht / diff);
                            if (slope <= this.sl) {
                                this.grounded = true;
                                this.inAir = false;
                                this.stillFallTime = 0;
                                this.avatar.position.copyFrom(this.avStartPos);
                            }
                        }
                    }
                    this.updateTargetValue();
                }
                if (anim !== null && noMoveKeyPressed) {
                    if (this.avatarSkeleton !== null) {
                        if (this.prevAnim !== anim) {
                            this.prevAnim = anim
                            if (anim.exist){
                                this.avatarSkeleton.beginAnimation(anim.name, true, anim.r);
                            }
                        }
                    }
                }
                return;
            }

            this.stillFallTime = 0;
            this.grounded = false;

            let dt: number = this.scene.getEngine().getDeltaTime() / 1000;
            //distance by which AV should have walked since last frame
            let walkDist: number = this.avatarSpeed * dt;
            //actual distance to be calculated based on whether AV is walking, runnning, or backing
            let actDist: number = 0;

            //initial down velocity
            let u: number = this.movFallTime * this.gravity
            //if no ground or slope then distance which av would fall down since last frame
            this.freeFallDist = u * dt + this.gravity * dt * dt / 2;
            this.movFallTime = this.movFallTime + dt;

            let moving: boolean = false;

            let jumpDist: number = this.avatarSpeed * dt;
            let dir: number = 1;
            let forward: Vector3;
            let backwards: Vector3;
            let stepLeft: Vector3;
            let stepRight: Vector3;

            if (!this.inAir) {
                if (this.key.up) {
                    if (this.key.shift) {
                        actDist = walkDist * 2;
                        anim = this.run;
                    } else {
                        actDist = walkDist;
                        anim = this.walk;
                    }
                    if (this.key.jump) {
                        this.wasJumping = true;
                    }
                    if (this.wasJumping) {
                        jumpDist *= 2;
                        if (this.jumpCycle < this.jumpCycleMax / 2) {
                            dir = 1;
                            if (this.jumpCycle < 0) {
                                this.jumpCycle = this.jumpCycleMax;
                                //jumpDist /= 2;
                                jumpDist = -this.freeFallDist;
                                this.key.jump = false;
                                this.wasJumping = false;
                            }
                        } else {
                            dir = -1;
                        }
                        anim = this.jump;
                        this.jumpCycle--;
                        forward = this.avatar.calcMovePOV(0, -jumpDist * dir, actDist);
                    } else {
                        forward = this.avatar.calcMovePOV(0, -this.freeFallDist, actDist);
                    }
                    this.avatar.moveWithCollisions(forward);
                    moving = true;
                } else if (this.key.down) {
                    backwards = this.avatar.calcMovePOV(0, -this.freeFallDist, -walkDist / 2);
                    this.avatar.moveWithCollisions(backwards);
                    moving = true;
                    anim = this.walkBack;
                    if (this.key.jump) this.key.jump = false;
                } else if (this.key.stepLeft) {
                    anim = this.strafeLeft;
                    stepLeft = this.avatar.calcMovePOV(-walkDist / 2, -this.freeFallDist, 0);
                    this.avatar.moveWithCollisions(stepLeft);
                    moving = true;
                } else if (this.key.stepRight) {
                    anim = this.strafeRight;
                    stepRight = this.avatar.calcMovePOV(walkDist / 2, -this.freeFallDist, 0);
                    this.avatar.moveWithCollisions(stepRight);
                    moving = true;
                }

                //jump when stationary
                if (!moving) {
                    if (this.key.jump) {
                        this.wasJumping = true;
                    }
                    if (this.wasJumping) {
                        jumpDist *= 2;
                        if (this.jumpCycle < this.jumpCycleMax / 2) {
                            dir = 1;
                            if (this.jumpCycle < 0) {
                                this.jumpCycle = this.jumpCycleMax;
                               // jumpSpeed /= 2;
                                jumpDist = -this.freeFallDist;
                                this.key.jump = false;
                                this.wasJumping = false;
                            }
                        } else {
                            anim = this.jump;
                            dir = -1;
                        }
                        this.jumpCycle--;
                        this.avatar.moveWithCollisions(new Vector3(0, -jumpDist * dir, 0));
                    }
                }
            }
            if (!this.key.stepLeft && !this.key.stepRight) {
                if (this.key.left) {
                    this.camera.alpha = this.camera.alpha + 0.022;
                    if (!moving) {
                        this.avatar.rotation.y = -4.69 - this.camera.alpha;
                        anim = this.turnLeft;
                    }
                } else if (this.key.right) {
                    this.camera.alpha = this.camera.alpha - 0.022;
                    if (!moving) {
                        this.avatar.rotation.y = -4.69 - this.camera.alpha;
                        anim = this.turnRight;
                    }
                }
            }
            if (moving) {
                this.avatar.rotation.y = -4.69 - this.camera.alpha;
            }


            if (this.avatar.position.y < this.avStartPos.y) {
                //if we are sliding down then check if we are on slope or falling down
                let ht: number = this.avStartPos.y - this.avatar.position.y;
                let delta: number = Math.abs(this.freeFallDist - ht);

                if (delta < 0.0001) {
                    //to remove fliker check if AV has been falling down continously for last few consecutive frames
                    this.fallFrameCount++;
                    if (this.fallFrameCount > this.fallFrameCountMin) {
                        this.inAir = true;
                    }
                } else {
                    this.fallFrameCount = 0;
                    this.inAir = false;
                    //we are not falling down
                    let diff: number = this.avStartPos.subtract(this.avatar.position).length();
                    let slope: number = Math.asin(ht / diff);
                    if (slope <= this.sl) {
                        this.movFallTime = 0;
                    }
                }
            } else {
                this.movFallTime = 0;
                this.fallFrameCount = 0;
                this.inAir = false;
            }

            if (anim != null) {
                if (this.avatarSkeleton !== null) {
                    if (this.prevAnim.name !== anim.name) {
                        if (anim.exist) {
                            this.avatarSkeleton.beginAnimation(anim.name, true, anim.r);
                        }
                        this.prevAnim = anim;
                    }
                }
            }
            this.updateTargetValue();
            return;
        }

        private updateTargetValue() {
            this.camera.target.copyFromFloats(this.avatar.position.x, (this.avatar.position.y + 1.5), this.avatar.position.z);
        }

        move: boolean = false;
        private onKeyDown(e: Event) {

            var event: KeyboardEvent = <KeyboardEvent> e;
            var chr: string = String.fromCharCode(event.keyCode);

            if (event.keyCode === 32) this.key.jump = false;
            else if (event.keyCode === 16) this.key.shift = true;
            //WASD or arrow keys
            else if ((chr === "W") || (event.keyCode === 38)) this.key.up = true;
            else if ((chr === "A") || (event.keyCode === 37)) this.key.left = true;
            else if ((chr === "D") || (event.keyCode === 39)) this.key.right = true;
            else if ((chr === "S") || (event.keyCode === 40)) this.key.down = true;
            else if (chr === "Q") this.key.stepLeft = true;
            else if (chr === "E") this.key.stepRight = true;
            this.move = this.anyMovement();

        }

        public anyMovement(): boolean {
            if (this.key.up || this.key.down || this.key.left || this.key.right || this.key.stepLeft || this.key.stepRight || this.key.jump) {
                return true;
            } else {
                return false;
            }
        }

        private onKeyUp(e: Event) {

            var event: KeyboardEvent = <KeyboardEvent> e;
            var chr: string = String.fromCharCode(event.keyCode);

            if (event.keyCode === 32) this.key.jump = true
            else if (event.keyCode === 16) {this.key.shift = false;}
            //WASD or arrow keys
            else if ((chr === "W") || (event.keyCode === 38)) this.key.up = false;
            else if ((chr === "A") || (event.keyCode === 37)) this.key.left = false;
            else if ((chr === "D") || (event.keyCode === 39)) this.key.right = false;
            else if ((chr === "S") || (event.keyCode === 40)) this.key.down = false;
            else if (chr === "Q") this.key.stepLeft = false;
            else if (chr === "E") this.key.stepRight = false;

            this.move = this.anyMovement();

        }

        //calc distance in horizontal plane
        private horizontalMove(v1: Vector3, v2: Vector3): number {
            let dx: number = v1.x - v2.x;
            let dz: number = v1.z - v2.z;
            let d: number = Math.sqrt(dx * dx + dz * dz);
            return d;

        }
    }

    export class AnimData {

        public name: string;
        //start
        public s: number;
        //end
        public e: number;
        //rate
        public r: number;
        public exist: boolean = false;

        public constructor(name: string, s: number, e: number, d: number) {
            this.s = 0;
            this.e = 0;
            this.r = 0;
            this.name = name;
            this.s = s;
            this.e = e;
            this.r = d;
        }
    }

    export class Key {
        public up: boolean;

        public down: boolean;

        public right: boolean;

        public left: boolean;

        public stepRight: boolean;

        public stepLeft: boolean;

        public jump: boolean;

        public shift: boolean;


        constructor() {
            this.up = false;
            this.down = false;
            this.right = false;
            this.left = false;
            this.stepRight = false;
            this.stepLeft = false;
            this.jump = false;
            this.shift = false;
        }

        reset() {
            this.up = false;
            this.down = false;
            this.right = false;
            this.left = false;
            this.stepRight = false;
            this.stepLeft = false;
            this.jump = false;
            this.shift = false;
        }
    }
}
