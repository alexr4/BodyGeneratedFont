//#region P5 Context
const FontGenerator = (p5) => {
    let  isReady = false;
    let  isLoading = false;
    let  videoParams;
    let  imageSource;
    let  isSourceDrawn = false;

    let  lastposes = [];
    let  poses = [];
    let  isBonesDrawn = true;
    let  isBonesCentered = false;
    let  gravityPoint;
    let  magVelScaleDebug = 2.5;

    let  fpsDisplayState = false;

    let  font;
    let  textToDeform;
    let  textBBox;
    let  fontSize = 200;
    let  txtPoints;
    let  particles = [];
    let  isTxtSet = false;
    let  txtSampleFactor = 0.25;
    let  txtSimplifyThreshold = 0.;

    //loading time;
    let maxTimeLoadingAnim = 1500;

    //skeleton description
    let skeletonDescriptionIndices = [
        //#region head
        8, 6, 6, 5, 5, 4, 4, 0,
        0, 1, 1, 2, 2, 3, 3, 7,
        10, 9,
        //#endregion
        //#region arm left
        18, 20, 20, 16, 16, 22, 18, 16, 16, 14, 14, 12,
        //#endregion
        //#region arm right
        19, 17, 17, 15, 15, 19, 15, 21, 15, 13, 13, 11,
        //#endregion 
        //#region body
        12, 11, 11, 23, 23, 24, 24, 12,
        //#endregion
        //#region leg left
        24, 26, 26, 28, 28, 30, 32, 30, 32, 28,
        //#endregion
        //#region leg right
        23, 25, 25, 27, 27, 29, 29, 31, 31, 27
        //#endregion
    ];

    p5.preload = () =>{
        font = p5.loadFont('./fonts/Roboto-Medium.ttf');
    }

    p5.setup = () =>{
        canvas = p5.createCanvas(p5.windowWidth, p5.windowHeight);
        canvas.class('output-canvas');

        gravityPoint = p5.createVector(0, 0);
    }

    p5.draw = () =>{
        p5.background(20);
        if(!isReady){
            if(isLoading){
                let time        = p5.millis() % maxTimeLoadingAnim;
                let normTime    = time / maxTimeLoadingAnim;
                
                p5.fill(240);
                p5.noStroke();
                p5.strokeWeight(1);
                p5.textSize(12);
                p5.textAlign(p5.CENTER, p5.CENTER);
                p5.text("Chargement...", p5.width/2, p5.height/2);
    
                p5.noFill();
                p5.stroke(240);
                p5.strokeWeight(10);
    
                let start   = normTime;
                let length  = .25;
                p5.arc(p5.width/2, p5.height/2, p5.height*.15, p5.height*.15, start * p5.TWO_PI, (start + length) * p5.TWO_PI);
            }else{
                p5.fill(240);
                p5.noStroke();
                p5.strokeWeight(1);
                p5.textSize(12);
                p5.textAlign(p5.CENTER, p5.CENTER);
                p5.text("Charger une vidéo pour démarrer...", p5.width/2, p5.height/2);
            }
            

            if(fpsDisplayState){
                p5.displayFPS();
           }
        }else{
            isLoading = false;
            p5.DebugView();

            if(isTxtSet){
                p5.computeParticleText(10);

                p5.noStroke();
                p5.fill(255, 0, 0, 20);
                for(let i=0; i<txtPoints.length; i++){
                    let p = txtPoints[i];
                    p5.ellipse(p.x - textBBox.w * .5, p.y + textBBox.h * .5, 4, 4);
                }

                p5.fill(255);
                for(let i=0; i<particles.length; i++){
                    let particle = particles[i];
                    particle.display();
                }
            }
        }
    }

    //#region Debug view
    p5.DebugView = () =>{
        if(isSourceDrawn && imageSource != undefined){
            p5.displaySourceImage();
        }

        if(poses.length > 0 && isBonesDrawn){
            p5.displaySkeleton();
            p5.displayBones();
        }

        if(fpsDisplayState){
             p5.displayFPS();
        }
    }

    p5.displayFPS = () =>{
        p5.fill(255);
        p5.noStroke();
        p5.textAlign(p5.CENTER, p5.TOP);
        p5.textSize(12);
        p5.text(`FPS: ${p5.round(p5.frameRate())} — DeltaTime: ${p5.deltaTime}`, p5.width/2, 20);
    }

    p5.displaySourceImage = () =>{
        canvas.drawingContext.drawImage(imageSource, videoParams.isCentered ? videoParams.marginX : 0, 0, videoParams.ctxWidth, videoParams.ctxHeight);
    }

    p5.displayBones = () => {
        p5.noStroke();
        p5.strokeWeight(2);
        p5.fill(255);
        for(let i=0; i<poses.length; i++){
            let bone        = poses[i];
            let bonePose    = p5.createVector(bone.x, bone.y);
            let viz         = bone.visibility;

            //display vel
            let lastBone        = lastposes[i];
            let lastBonePose    = p5.createVector(lastBone.x, lastBone.y);

            let velocity        = lastBonePose.copy().sub(bonePose);
            let velDir          = velocity.copy();
            velocity.mult(magVelScaleDebug);
            
            p5.stroke(p5.abs(velDir.x * 255), p5.abs(velDir.y * 255), 0);
            p5.line(bonePose.x, bonePose.y, bonePose.x + velocity.x, bonePose.y + velocity.y);

            if(viz > 0.5){
                p5.noStroke();
                p5.ellipse(bonePose.x, bonePose.y, 5, 5);
            }
        }

        if(isBonesCentered){
            p5.stroke(255, 20);
            p5.noFill();
            p5.strokeWeight(1);
            p5.line(p5.width*.5, 0, p5.width*.5, p5.height);
            p5.line(0, p5.height*.5, p5.width, p5.height*.5);
        }
    }

    p5.displaySkeleton = () => {
        p5.strokeWeight(1);
        p5.stroke(255, 50);

        for(let i=0; i<skeletonDescriptionIndices.length; i+=2){
            p5.drawBoneBetweenJoint(skeletonDescriptionIndices[i], skeletonDescriptionIndices[i+1]);
        }
    }

    p5.drawBoneBetweenJoint = (A, B) =>{
        p5.line(poses[A].x, poses[A].y, poses[B].x, poses[B].y);
    }
    //#endregion

    //#region Bones related computation
    p5.setBonesPositionToCanvas = () =>{
        for(let i=0; i<poses.length; i++){
            let bone    = poses[i];
            poses[i].x  = bone.x * videoParams.ctxWidth + (videoParams.isCentered ? videoParams.marginX : 0);
            poses[i].y  = bone.y * videoParams.ctxHeight;
        }
    }

    p5.centerBones = () =>{
        gravityPoint = p5.createVector(0, 0);
        for(let i=0; i<poses.length; i++){
            let boneVector = p5.createVector(poses[i].x, poses[i].y);
            gravityPoint.add(boneVector);
        }
        gravityPoint.div(poses.length);

        for(let i=0; i<poses.length; i++){
            let bone    = poses[i];
            poses[i].x  = bone.x - gravityPoint.x + (p5.height * videoParams.aspect) * 0.5 + videoParams.marginX;
            poses[i].y  = bone.y - gravityPoint.y + p5.height * 0.5;
        }
    }

    p5.getBonePositionAndVelocity = (index) =>{
        let bone        = poses[index];
        let position    = p5.createVector(bone.x, bone.y);

        //display vel
        let lastBone        = lastposes[index];
        let lastBonePose    = p5.createVector(lastBone.x, lastBone.y);

        let velocity        = lastBonePose.copy().sub(position);
        
        return {position, velocity};
    }
    //#endregion

    //#region text related computations
    p5.computeTextBoundingBox = () =>{
        p5.push();
        p5.textAlign(p5.CENTER, p5.CENTER);
        p5.textSize(fontSize);
        textBBox = font.textBounds(textToDeform, p5.width/2, p5.height/2);
        p5.pop();
    }

    p5.computeTextToPoints = () =>{
        p5.push();
        p5.textAlign(p5.CENTER, p5.CENTER);
        txtPoints = font.textToPoints(textToDeform, p5.width/2, p5.height/2, fontSize, {
            sampleFactor: txtSampleFactor,
            simplifyThreshold: txtSimplifyThreshold
          });
        p5.pop();
    }

    p5.computeParticleText = (minDist) => {
        //friction
        let coef = 0.1;
        let normal = 1;
        let frictionMag = coef * normal;
        
        for(let i=0; i<particles.length; i++){
            let particle = particles[i];
            
            for(let j=0; j<poses.length; j++){
                let bone    = p5.getBonePositionAndVelocity(j);

                let toBone  = particle.position.copy().sub(bone.position);
                if(toBone.mag() <= minDist){
                    let newVel = toBone.normalize().mult(bone.velocity.mag());
                    particle.applyForce(newVel);
                }
            }

            let friction = particle.velocity.copy();
            friction.mult(-1);
            friction.normalize();
            friction.mult(frictionMag);
            particle.applyForce(friction);

            particle.update();
            particle.dampVelocity();
        }
    }
    //#endregion

    p5.windowResized = () => {
        p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
    }

    //#region Setter
    p5.setReady = (state) => {
        isReady = state;
    }

    p5.setLoading = (state) => {
        isLoading = state;
    } 

    p5.bindSkeleton = (skeletonData) => {
        //bind previous
        lastposes = (poses.length > 0) ? poses : undefined;
        //bind new poses
        poses = skeletonData;
        p5.setBonesPositionToCanvas();
        if(isBonesCentered){
            p5.centerBones();
        }

        if(lastposes == undefined) lastposes = poses; //flag for first frame
    }

    p5.bindImageSource = (source) =>{
        imageSource = source;
    }

    p5.setSourceParams = (value)=>{
        videoParams             = value;
        videoParams.ctxWidth    = p5.height * videoParams.aspect;
        videoParams.ctxHeight   = p5.height;
        videoParams.isCentered  = true;
        videoParams.marginX     = (p5.width - videoParams.ctxWidth) * 0.5;
    }

    p5.setDrawSourceState = (state)=>{
        isSourceDrawn = state;
    }

    p5.setDrawBonesState = (state) =>{
        isBonesDrawn = state;
    }

    p5.setBonesCenteredState = (state) =>{
        isBonesCentered = state;
    }

    p5.setFPSDisplayState = (state) =>{
        fpsDisplayState = state;
    }

    p5.setTextToDeform = (text) =>{
        textToDeform = text;
        if(text.length > 0){
            p5.computeTextBoundingBox();
            p5.computeTextToPoints();

            particles = [];
            for(let i=0; i<txtPoints.length; i++){
                let pt  = txtPoints[i];
                let x   = pt.x - textBBox.w * .5;
                let y   = pt.y + textBBox.h * .5;
                particles.push(new Particle(p5, x, y));
            }
    
            isTxtSet = true;
        }else{
            isTxtSet = false;
        }
    }
    //#endregion
}
//#endregion

//#region particle class
class Particle{
    constructor(p5, x, y){
        this.p5ctx          = p5;         
        this.position       = this.p5ctx.createVector(x, y);
        this.velocity       = this.p5ctx.createVector(0, 0);
        this.acceleration   = this.p5ctx.createVector(0, 0);

        this.maxForce       = 0.25;
        this.maxSpeed       = 3.0;
        this.radius         = 2;
    }

    applyForce(force){
        //mass could be add using A = F/M
        this.acceleration.add(force);
    }

    dampVelocity(){
        if(this.velocity.mag() <= 0.01){
            this.velocity.mult(0);
        }
    }

    update(){
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed);
        this.position.add(this.velocity);
        this.acceleration.mult(0);
    }

    display(){
        this.p5ctx.ellipse(this.position.x, this.position.y, 2, 2);
    }
}
//#endregion