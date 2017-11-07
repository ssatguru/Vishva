
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
        maxSlopeLimit: number = 45;
        //slopeLimit in radians
        sl: number = Math.PI * this.slopeLimit / 180;
        sl2: number = Math.PI * this.maxSlopeLimit / 180;
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

        public setWalkSpeed(n: number) {
            this.walkSpeed = n;
        }
        public setRunSpeed(n: number) {
            this.runSpeed = n;
        }
        public setBackSpeed(n: number) {
            this.backSpeed = n;
        }
        public setJumpSpeed(n: number) {
            this.jumpSpeed = n;
        }
        public setLeftSpeed(n: number) {
            this.leftSpeed = n;
        }
        public setRightSpeed(n: number) {
            this.rightSpeed = n;
        }

        private started: boolean = false;

        public start() {
            if (this.started) return;
            this.started = true;
            this.key.reset();
            this.movFallTime = 0;
            //first time we enter render loop, delta time shows zero !!
            this.idleFallTime = 0.001;
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
        private slideBack: AnimData;
        private idle: AnimData;
        private run: AnimData;
        private jump: AnimData;
        private fall: AnimData;
        private turnLeft: AnimData;
        private turnRight: AnimData;
        private strafeLeft: AnimData;
        private strafeRight: AnimData;

        private initAnims(anims: AnimData[]) {
            this.walk = anims[0];
            this.walkBack = anims[1];
            this.idle = anims[2];
            this.idle.r = 0.5;
            this.run = anims[3];
            this.jump = anims[4];
            this.jump.r = 4;
            this.fall = anims[5];
            this.turnLeft = anims[6];
            this.turnRight = anims[7];
            this.strafeLeft = anims[8];
            this.strafeRight = anims[9];
            this.slideBack = anims[10];
        }

        //avatar walking speed in meters/second
        private walkSpeed: number = 3;
        private runSpeed: number = this.walkSpeed * 2;
        private backSpeed: number = this.walkSpeed / 2;
        private jumpSpeed: number = this.walkSpeed * 2;
        private leftSpeed: number = this.walkSpeed / 2;
        private rightSpeed: number = this.walkSpeed / 2;


        private prevAnim: AnimData = null;

        //private isJumping: boolean = false;

        private gravity: number = 9.8;
        private avStartPos: Vector3 = new Vector3(0, 0, 0);
        private grounded: boolean = false;
        //distance by which AV would move down if in freefall
        private freeFallDist: number = 0;



        //how many minimum contiguos frames should the AV have been in free fall
        //before we assume AV is really in freefall.
        //we will use this to remove animation flicker (fall, no fall, fall etc)
        private fallFrameCountMin: number = 10;
        private fallFrameCount: number = 0;


        private inAir: boolean = false;
        private wasWalking: boolean = false;
        private wasRunning: boolean = false;
        private moveVector: Vector3;

        private moveAVandCamera() {
            this.avStartPos.copyFrom(this.avatar.position);
            let anim: AnimData = null;
            let dt: number = this.scene.getEngine().getDeltaTime() / 1000;

            if (this.key.jump) {
                this.grounded = false;
                anim = this.fall;
                anim = this.doJump(dt);
            } else if (this.anyMovement()) {
                this.grounded = false;
                anim = this.doMove(dt);
            } else {
                anim = this.doIdle(dt);
            }

            if (anim != null) {
                if (this.avatarSkeleton !== null) {
                    if (this.prevAnim !== anim) {
                        if (anim.exist) {
                            this.avatarSkeleton.beginAnimation(anim.name, anim.l, anim.r);
                        }
                        this.prevAnim = anim;
                    }
                }
            }
            this.updateTargetValue();
            return;
        }

        //verical position of AV when it is about to start a jump
        private jumpStartPosY: number = 0;
        //for how long the AV has been in the jump
        private jumpTime: number = 0;
        private doJump(dt: number): AnimData {

            let anim: AnimData = null;
            anim = this.jump;
            if (this.jumpTime === 0) {
                this.jumpStartPosY = this.avatar.position.y;
            }
            //up velocity at the begining of the lastt frame (v=u+at)
            let js: number = this.jumpSpeed - this.gravity * this.jumpTime;
            //distance travelled up since last frame to this frame (s=ut+1/2*at^2)
            let jumpDist: number = js * dt - 0.5 * this.gravity * dt * dt;
            this.jumpTime = this.jumpTime + dt;

            let forwardDist: number = 0;
            let disp: Vector3;

            if (this.wasRunning || this.wasWalking) {
                if (this.wasRunning) {
                    forwardDist = this.runSpeed * dt;
                } else if (this.wasWalking) {
                    forwardDist = this.walkSpeed * dt;
                }
                //find out in which horizontal direction the AV was moving when it started the jump
                disp = this.moveVector.clone();
                disp.y = 0;
                disp = disp.normalize();
                disp.scaleToRef(forwardDist, disp);
                disp.y = jumpDist;
            } else {
                disp = new Vector3(0, jumpDist, 0);
            }
            //moveWithCollision only seems to happen if length of displacment is atleast 0.001
            this.avatar.moveWithCollisions(disp);
            if (jumpDist < 0) {
                anim = this.fall;
                //check if going up a slope or back on flat ground 
                if ((this.avatar.position.y > this.avStartPos.y) || ((this.avatar.position.y === this.avStartPos.y) && (disp.length() > 0.001))) {
                    console.log("jump done1");
                    this.endJump();
                } else if (this.avatar.position.y < this.jumpStartPosY) {
                    //the avatar is below the point from where it started the jump
                    //so it is either in free fall or is sliding along a downward slope
                    //
                    //if the actual displacemnt is same as the desired displacement then AV is in freefall
                    //else it is on a slope
                    let actDisp: Vector3 = this.avatar.position.subtract(this.avStartPos);
                    if (!(this.areVectorsEqual(actDisp, disp, 0.001))) {
                        //AV is on slope
                        //Should AV continue to slide or stop?
                        //if slope is less steeper than acceptable then stop else slide
                        if (this.verticalSlope(actDisp) <= this.sl) {
                            console.log("jump done2");
                            this.endJump();
                        }
                    }

                }
            }
            return anim;
        }

        /**
         * does cleanup at the end of a jump
         */
        private endJump() {
            this.key.jump = false;
            this.jumpTime = 0;
            this.wasWalking = false;
            this.wasRunning = false;
        }

        /**
         * checks if two vectors v1 and v2 are equal with an equality precision of p
         */
        private areVectorsEqual(v1: Vector3, v2: Vector3, p: number) {
            return ((Math.abs(v1.x - v2.x) < p) && (Math.abs(v1.y - v2.y) < p) && (Math.abs(v1.z - v2.z) < p));
        }
        /*
         * returns the slope (in radians) of a vector in the vertical plane
         */
        private verticalSlope(v: Vector3): number {
            return Math.atan(Math.abs(v.y / Math.sqrt(v.x * v.x + v.z * v.z)));
        }

        //for how long has the av been falling while moving
        private movFallTime: number = 0;

        private doMove(dt: number): AnimData {

            //initial down velocity
            let u: number = this.movFallTime * this.gravity
            //if no ground or slope then distance by which av should fall down since last frame
            this.freeFallDist = u * dt + this.gravity * dt * dt / 2;
            this.movFallTime = this.movFallTime + dt;

            this.idleFallTime = 0;
            this.grounded = false;
            let moving: boolean = false;
            this.wasWalking = false;
            this.wasRunning = false;

            let anim: AnimData = null;
            if (this.key.forward) {
                let forwardDist: number = 0;
                if (this.key.shift) {
                    this.wasRunning = true;
                    forwardDist = this.runSpeed * dt;
                    anim = this.run;
                } else {
                    this.wasWalking = true;
                    forwardDist = this.walkSpeed * dt;
                    anim = this.walk;
                }
                this.moveVector = this.avatar.calcMovePOV(0, -this.freeFallDist, forwardDist);
                moving = true;
            } else if (this.key.backward) {
                this.moveVector = this.avatar.calcMovePOV(0, -this.freeFallDist, -(this.backSpeed * dt));
                anim = this.walkBack;
                moving = true;
            } else if (this.key.stepLeft) {
                anim = this.strafeLeft;
                this.moveVector = this.avatar.calcMovePOV(-(this.leftSpeed * dt), -this.freeFallDist, 0);
                moving = true;
            } else if (this.key.stepRight) {
                anim = this.strafeRight;
                this.moveVector = this.avatar.calcMovePOV((this.rightSpeed * dt), -this.freeFallDist, 0);
                moving = true;
            }


            if (!this.key.stepLeft && !this.key.stepRight) {
                if (this.key.turnLeft) {
                    this.camera.alpha = this.camera.alpha + 0.022;
                    if (!moving) {
                        this.avatar.rotation.y = -4.69 - this.camera.alpha;
                        anim = this.turnLeft;
                    }
                } else if (this.key.turnRight) {
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
            if (moving && this.moveVector.length() > 0.001) {
                this.avatar.moveWithCollisions(this.moveVector);
                //this.avatar.computeWorldMatrix(true);

                //walking up a slope
                if (this.avatar.position.y > this.avStartPos.y) {
                    let actDisp: Vector3 = this.avatar.position.subtract(this.avStartPos);
                    if (this.verticalSlope(actDisp) > this.sl2) {
                        this.avatar.position.copyFrom(this.avStartPos);
                    }
                    this.movFallTime = 1;
                } else if ((this.avatar.position.y + 0.01) < this.avStartPos.y) {

                    console.log("sliding down on walk " + this.avatar.position.y + "," + this.avStartPos.y);

                    let actDisp: Vector3 = this.avStartPos.subtract(this.avatar.position);
                    if (!(this.areVectorsEqual(actDisp, this.moveVector, 0.001))) {
                        //AV is on slope
                        //Should AV continue to slide or walk?
                        //if slope is less steeper than acceptable then walk else slide
                        if (this.verticalSlope(actDisp) <= this.sl) {
                            this.movFallTime = 1;
                        } else {
                            anim = this.slideBack;//should be slide
                        }
                    } else {
                        anim = this.slideBack;
                    }

                    //if we are sliding down then check if we are on slope or falling down
                    //                    let ht: number = this.avStartPos.y - this.avatar.position.y;
                    //                    let delta: number = Math.abs(this.freeFallDist - ht);
                    //
                    //                    if (delta < 0.0001) {
                    //                        //to remove flicker, check if AV has been falling down continously for last few consecutive frames
                    //                        this.fallFrameCount++;
                    //                        if (this.fallFrameCount > this.fallFrameCountMin) {
                    //                            this.inAir = true;
                    //                            console.log("in air");
                    //                        }
                    //                    } else {
                    //                        this.fallFrameCount = 0;
                    //                        this.inAir = false;
                    //                        //we are not falling down
                    //                        let diff: number = this.avStartPos.subtract(this.avatar.position).length();
                    //                        let slope: number = Math.asin(ht / diff);
                    //                        if (slope <= this.sl) {
                    //                            this.movFallTime = 0;
                    //                        } else {
                    //                            //this.inAir = true;
                    //                        }
                    //                    }
                } else {
                    this.movFallTime = 1;
                    this.fallFrameCount = 0;
                    this.inAir = false;
                }
            }

            return anim;

        }

        //for how long has the av been falling while idle (not moving)
        private idleFallTime: number = 0;
        private doIdle(dt: number): AnimData {
            let anim: AnimData = this.idle;;
            this.fallFrameCount = 0;
             this.movFallTime = 0;
            if (!this.grounded) {
                if (dt === 0) {
                    this.freeFallDist = 5;
                } else {
                    let u: number = this.idleFallTime * this.gravity
                    this.freeFallDist = u * dt + this.gravity * dt * dt / 2;
                    this.idleFallTime = this.idleFallTime + dt;
                }
                //if displacement is less than 0.01(? need to verify further) then 
                //moveWithDisplacement down against a surface seems to push the AV up by a small amount!!
                if (this.freeFallDist < 0.01) return anim;
                let disp: Vector3 = new Vector3(0, -this.freeFallDist, 0);;
                this.avatar.rotation.y = -4.69 - this.camera.alpha;
                this.avatar.moveWithCollisions(disp);
                if ((this.avatar.position.y > this.avStartPos.y) || (this.avatar.position.y === this.avStartPos.y)) {
                    console.log("grounding av c pos : " + this.avatar.position.y + " av start pos:" + this.avStartPos.y);
                    if (this.avatar.position.y === this.avStartPos.y) console.log("same position");
                    this.grounded = true;
                    this.idleFallTime = 0;
                } else if (this.avatar.position.y < this.avStartPos.y) {
                    //AV is going down. 
                    //AV is either in free fall or is sliding along a downward slope
                    //
                    //if the actual displacemnt is same as the desired displacement then AV is in freefall
                    //else it is on a slope
                    let actDisp: Vector3 = this.avatar.position.subtract(this.avStartPos);
                    if (!(this.areVectorsEqual(actDisp, disp, 0.001))) {
                        //AV is on slope
                        //Should AV continue to slide or stop?
                        //if slope is less steeper than accebtable then stop else slide
                        if (this.verticalSlope(actDisp) <= this.sl) {
                            console.log("still slide stop");
                            this.grounded = true;
                            this.idleFallTime = 0;
                            this.avatar.position.copyFrom(this.avStartPos);
                        } else {
                            anim = this.slideBack;
                        }

                    }

                }
            }
            return anim;
        }

        public moveAVandCamera_old(): boolean {
            this.avStartPos.copyFrom(this.avatar.position);
            let jumpDist: number = 0;
            let anim: AnimData = null;
            let noMoveKeyPressed: boolean = !this.anyMovement();
            //skip everything if no movement key pressed
            if (this.inAir || noMoveKeyPressed) {

                this.fallFrameCount = 0;

                if (!this.grounded) {
                    let dt: number = this.scene.getEngine().getDeltaTime() / 1000;
                    anim = this.idle;
                    if (dt === 0) {
                        this.freeFallDist = 5;
                    } else {
                        this.idleFallTime = this.idleFallTime + dt;
                        let u: number = this.idleFallTime * this.gravity
                        this.freeFallDist = u * dt + this.gravity * dt * dt / 2;
                    }
                    let forwardDist: number = 0;
                    let disp: Vector3;

                    if ((this.inAir) && (this.wasRunning || this.wasWalking)) {
                        if (this.wasRunning) {
                            forwardDist = this.runSpeed * dt;
                        } else if (this.wasWalking) {
                            forwardDist = this.walkSpeed * dt;
                        }
                        disp = this.moveVector.normalize();
                        //disp.y = 0;
                        disp.scaleToRef(forwardDist, disp);
                        disp.y = -this.freeFallDist;
                    } else {
                        disp = new Vector3(0, -this.freeFallDist, 0);
                    }
                    this.avatar.rotation.y = -4.69 - this.camera.alpha;
                    //let disp:Vector3 = this.avatar.calcMovePOV(0, -this.freeFallDist, forwardDist);
                    this.avatar.moveWithCollisions(disp);
                    console.log(disp);
                    console.log("new " + this.avatar.position.y + " old " + this.avStartPos.y);
                    if ((this.avatar.position.y > this.avStartPos.y) || ((this.avatar.position.y === this.avStartPos.y) && (this.freeFallDist > 0.001))) {
                        this.grounded = true;
                        this.inAir = false;
                        console.log("not in air 1");
                        this.idleFallTime = 0;
                        this.wasWalking = false;
                        this.wasRunning = false;
                    } else if (this.avatar.position.y < this.avStartPos.y) {
                        //AV is going down. 
                        //Check if AV is fallling down or is on a slope
                        //if the actual distance travelled down is same as what AV would have travelled if in freefall
                        //then AV is in freefall else AV is on a slope
                        let ht: number = this.avStartPos.y - this.avatar.position.y;
                        console.log(ht);
                        let delta: number = Math.abs(this.freeFallDist - ht);
                        if (delta < 0.0001) {
                            if (ht > 0.01) {
                                console.log("free fall. changing anim");
                                if (this.idleFallTime > dt) anim = this.fall;
                            }
                        } else {
                            let diff: number = this.avStartPos.subtract(this.avatar.position).length();
                            let slope: number = Math.asin(ht / diff);
                            if (slope <= this.sl) {
                                this.grounded = true;
                                this.inAir = false;
                                console.log("not in air 2");
                                this.idleFallTime = 0;
                                this.wasWalking = false;
                                this.wasRunning = false;
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
                            if (anim.exist) {
                                console.log("playing anim 1 " + anim.name);
                                this.avatarSkeleton.beginAnimation(anim.name, true, anim.r);
                            }
                        }
                    }
                }
                return;
            }

            this.idleFallTime = 0;
            this.grounded = false;

            let dt: number = this.scene.getEngine().getDeltaTime() / 1000;

            //initial down velocity
            let u: number = this.movFallTime * this.gravity
            //if no ground or slope then distance which av would fall down since last frame
            this.freeFallDist = u * dt + this.gravity * dt * dt / 2;
            this.movFallTime = this.movFallTime + dt;

            let moving: boolean = false;

            this.wasWalking = false;
            this.wasRunning = false;
            if (this.key.forward) {
                let forwardDist: number = 0;
                if (this.key.shift) {
                    this.wasRunning = true;
                    forwardDist = this.runSpeed * dt;
                    anim = this.run;
                } else {
                    this.wasWalking = true;
                    forwardDist = this.walkSpeed * dt;
                    anim = this.walk;
                }
                if (!this.key.jump) {
                    this.moveVector = this.avatar.calcMovePOV(0, -this.freeFallDist, forwardDist);
                    this.avatar.moveWithCollisions(this.moveVector);
                } else {
                    anim = this.jump;
                    if (this.jumpTime === 0) {
                        this.jumpStartPosY = this.avatar.position.y;
                    }
                    //up velocity at the begining of the lastt frame (v=u+at)
                    let js: number = this.jumpSpeed - this.gravity * this.jumpTime;
                    //distance travelled up since last frame to this frame (s=ut+1/2*at^2)
                    jumpDist = js * dt - 0.5 * this.gravity * dt * dt;
                    this.jumpTime = this.jumpTime + dt;
                    this.moveVector = this.avatar.calcMovePOV(0, jumpDist, forwardDist);
                    this.avatar.moveWithCollisions(this.moveVector);
                    if (jumpDist < -0.001) {
                        anim = this.fall;
                        //if back on flat ground or going up the slope or back to where AV was when it started the jump (need to check for going down the slope!)
                        if ((this.avatar.position.y >= this.avStartPos.y) || (this.avatar.position.y <= this.jumpStartPosY)) {
                            //this.isJumping = false;
                            this.key.jump = false;
                            console.log("jump done");
                            this.jumpTime = 0;
                        }
                    }
                }
                moving = true;
            } else if (this.key.backward) {
                this.moveVector = this.avatar.calcMovePOV(0, -this.freeFallDist, -(this.backSpeed * dt));
                this.avatar.moveWithCollisions(this.moveVector);
                moving = true;
                anim = this.walkBack;
                if (this.key.jump) this.key.jump = false;
            } else if (this.key.stepLeft) {
                anim = this.strafeLeft;
                this.moveVector = this.avatar.calcMovePOV(-(this.leftSpeed * dt), -this.freeFallDist, 0);
                this.avatar.moveWithCollisions(this.moveVector);
                moving = true;
            } else if (this.key.stepRight) {
                anim = this.strafeRight;
                this.moveVector = this.avatar.calcMovePOV((this.rightSpeed * dt), -this.freeFallDist, 0);
                this.avatar.moveWithCollisions(this.moveVector);
                moving = true;
            }

            //jump when stationary
            if (!moving) {
                if (this.key.jump) {
                    anim = this.jump;
                    if (this.jumpTime === 0) {
                        this.jumpStartPosY = this.avatar.position.y;
                    }
                    //up velocity at the begining of the last frame (v=u+at)
                    let js: number = this.jumpSpeed - this.gravity * this.jumpTime;
                    //distance travelled up since last frame to this frame (s=ut+1/2*at^2)
                    jumpDist = js * dt - 0.5 * this.gravity * dt * dt;
                    this.jumpTime = this.jumpTime + dt;
                    let moveVector: Vector3 = this.avatar.calcMovePOV(0, jumpDist, 0);
                    this.avatar.moveWithCollisions(moveVector);
                    if (jumpDist < -0.001) {
                        anim = this.fall;
                        //if back on flat ground or going up the slope or back to where AV was when it started the jump (need to check for going down the slope!)
                        if ((this.avatar.position.y >= this.avStartPos.y) || (this.avatar.position.y <= this.jumpStartPosY)) {
                            // this.isJumping = false;
                            this.key.jump = false;
                            console.log("jump done");
                            this.jumpTime = 0;
                        }
                    }
                }
            }

            if (!this.key.stepLeft && !this.key.stepRight) {
                if (this.key.turnLeft) {
                    this.camera.alpha = this.camera.alpha + 0.022;
                    if (!moving) {
                        this.avatar.rotation.y = -4.69 - this.camera.alpha;
                        anim = this.turnLeft;
                    }
                } else if (this.key.turnRight) {
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
                if (this.key.jump) {
                    delta = Math.abs(jumpDist + ht);
                }

                if (delta < 0.0001) {
                    //to remove flicker, check if AV has been falling down continously for last few consecutive frames
                    this.fallFrameCount++;
                    if (this.fallFrameCount > this.fallFrameCountMin) {
                        this.inAir = true;
                        console.log("in air");
                    }
                } else {
                    this.fallFrameCount = 0;
                    this.inAir = false;
                    //we are not falling down
                    let diff: number = this.avStartPos.subtract(this.avatar.position).length();
                    let slope: number = Math.asin(ht / diff);
                    if (slope <= this.sl) {
                        this.movFallTime = 0;
                    } else {
                        //this.inAir = true;
                    }
                }
            } else {
                this.movFallTime = 0;
                this.fallFrameCount = 0;
                this.inAir = false;
            }

            if (anim != null) {
                if (this.avatarSkeleton !== null) {
                    if (this.prevAnim !== anim) {
                        if (anim.exist) {
                            console.log("playing anim 2 " + anim.name);
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

            if (event.keyCode === 32) {
                //if (!this.isJumping) this.key.jump = true;
                this.key.jump = true;
            } else if (event.keyCode === 16) this.key.shift = true;
            //WASD or arrow keys
            else if ((chr === "W") || (event.keyCode === 38)) this.key.forward = true;
            else if ((chr === "A") || (event.keyCode === 37)) this.key.turnLeft = true;
            else if ((chr === "D") || (event.keyCode === 39)) this.key.turnRight = true;
            else if ((chr === "S") || (event.keyCode === 40)) this.key.backward = true;
            else if (chr === "Q") this.key.stepLeft = true;
            else if (chr === "E") this.key.stepRight = true;
            this.move = this.anyMovement();

        }

        public anyMovement(): boolean {
            return (this.key.forward || this.key.backward || this.key.turnLeft || this.key.turnRight || this.key.stepLeft || this.key.stepRight);
        }

        private onKeyUp(e: Event) {

            var event: KeyboardEvent = <KeyboardEvent> e;
            var chr: string = String.fromCharCode(event.keyCode);

            if (event.keyCode === 32) {
                //if (!this.isJumping) this.key.jump = true;
            } else if (event.keyCode === 16) {this.key.shift = false;}
            //WASD or arrow keys
            else if ((chr === "W") || (event.keyCode === 38)) this.key.forward = false;
            else if ((chr === "A") || (event.keyCode === 37)) this.key.turnLeft = false;
            else if ((chr === "D") || (event.keyCode === 39)) this.key.turnRight = false;
            else if ((chr === "S") || (event.keyCode === 40)) this.key.backward = false;
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
        //loop
        public l: boolean;
        //rate
        public r: number;
        public exist: boolean = false;

        public constructor(name: string, l: boolean, r: number) {
            this.name = name;
            this.l = l;
            this.r = r;
        }
    }

    export class Key {
        public forward: boolean;

        public backward: boolean;

        public turnRight: boolean;

        public turnLeft: boolean;

        public stepRight: boolean;

        public stepLeft: boolean;

        public jump: boolean;

        public shift: boolean;


        constructor() {
            this.forward = false;
            this.backward = false;
            this.turnRight = false;
            this.turnLeft = false;
            this.stepRight = false;
            this.stepLeft = false;
            this.jump = false;
            this.shift = false;
        }

        reset() {
            this.forward = false;
            this.backward = false;
            this.turnRight = false;
            this.turnLeft = false;
            this.stepRight = false;
            this.stepLeft = false;
            this.jump = false;
            this.shift = false;
        }
    }
}
