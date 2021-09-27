//#region P5 Context
const FontGenerator = (p5) => {
    let isReady = false;
    let isLoading = false;
    let videoParams;
    let imageSource;
    let isSourceDrawn = false;
    let center;

    let lastposes = [];
    let poses = [];
    let isBonesDrawn = true;
    let isBonesCentered = false;
    let gravityPoint;
    let magVelScaleDebug = 2.5;

    let fpsDisplayState = true;

    let font;
    let textToDeform;
    let textBBox;
    let fontSize = 200;
    let txtPoints;
    let txtBounds;
    let txtVert = [];
    let particles = [];
    let isTxtSet = false;
    let txtSampleFactor = .125;
    let txtSimplifyThreshold = 0.0;
    let lerpOffsetBetweenOandA = 1.0;
    let minDistFromBone = 50;
    let minBoneVel = 5.0;
    let boneVelDamp = 0.1;
    let boneNoiseFreq = 0.01;
    let originTypeDisplay = false;
    let multFontSize = 1.0;

    //loading time;
    let maxTimeLoadingAnim = 1500;

    //skeleton description
    let skeletonDescriptionIndices = [
        //#region head [0 → 16]
        8, 6, 6, 5, 5, 4, 4, 0,
        0, 1, 1, 2, 2, 3, 3, 7,
        10, 9,
        //#endregion
        //#region arm left [17 → 29]
        18, 20, 20, 16, 16, 22, 18, 16, 16, 14, 14, 12,
        //#endregion
        //#region arm right [30 → 42]
        19, 17, 17, 15, 15, 19, 15, 21, 15, 13, 13, 11,
        //#endregion 
        //#region body [43 → 51]
        12, 11, 11, 23, 23, 24, 24, 12,
        //#endregion
        //#region leg left [52 → 62]
        24, 26, 26, 28, 28, 30, 32, 30, 32, 28,
        //#endregion
        //#region leg right [63 → 73]
        23, 25, 25, 27, 27, 29, 29, 31, 31, 27
        //#endregion
    ];

    let pgsvg;
    let pgpng;
    let saving = false;
    const capturer = new CCapture({
        framerate: 30,
        format: "png",
        name: "movie",
        quality: 100,
        verbose: true,
        autoSaveTime : true
      });
      

    p5.preload = () => {
        // font = p5.loadFont('./fonts/Roboto-Medium.ttf');
        font = p5.loadFont('./fonts/BNMLunch-Medium.ttf');
    }

    p5.setup = () => {
        canvas = p5.createCanvas(p5.windowWidth, p5.windowHeight);
        canvas.class('output-canvas');

        gravityPoint = p5.createVector(0, 0);

        //saving ctx
        pgsvg   = p5.createGraphics(p5.width, p5.height, p5.SVG);
        pgpng   = p5.createGraphics(p5.width, p5.height);
        center = p5.createVector(p5.width * 0.5, p5.height * 0.5);
    }

    p5.draw = () => {
        p5.background(20);
        if (!isReady) {
            if (isLoading) {
                let time = p5.millis() % maxTimeLoadingAnim;
                let normTime = time / maxTimeLoadingAnim;

                p5.fill(240);
                p5.noStroke();
                p5.strokeWeight(1);
                p5.textSize(12);
                p5.textAlign(p5.CENTER, p5.CENTER);
                p5.text("Chargement...", p5.width / 2, p5.height / 2);

                p5.noFill();
                p5.stroke(240);
                p5.strokeWeight(10);

                let start = normTime;
                let length = .25;
                p5.arc(p5.width / 2, p5.height / 2, p5.height * .15, p5.height * .15, start * p5.TWO_PI, (start + length) * p5.TWO_PI);
            } else {
                p5.fill(240);
                p5.noStroke();
                p5.strokeWeight(1);
                p5.textSize(12);
                p5.textAlign(p5.CENTER, p5.CENTER);
                p5.text("Charger une vidéo pour démarrer...", p5.width / 2, p5.height / 2);
            }


            if (fpsDisplayState) {
                p5.displayFPS();
            }
        } else {
            isLoading = false;
            p5.DebugView();

            if (isTxtSet) {
                //? : qui to compute bezier? How to compute tangent ?
                p5.computeParticleText(minDistFromBone, minBoneVel, boneVelDamp, boneNoiseFreq);
                p5.drawShapeFont(p5);
            }

            //saving sequence
            if(saving){
                console.log("Start Capture");
                p5.saveAsPNG();
                capturer.capture(pgpng.canvas);
            }
        }
    }

    p5.drawShapeFont = (drctx) =>{
        drctx.push();
        drctx.noStroke();
        drctx.fill('#000064');
        for(let i=0; i<txtVert.length; i++){
            let inner = txtVert[i].innerPoints;
            let outer = txtVert[i].outerPoints;
            
            let last;

            drctx.beginShape();
            drctx.fill('#000064');
            for(let j=0; j<inner.length; j++){
                let vert        = inner[j];
                let particle    = particles[vert.z];
                let pos         = particle.lerpOrigin(lerpOffsetBetweenOandA);
                let toCenter    = pos.copy().sub(center);
                let newPos      = center.copy().add(toCenter.copy().mult(multFontSize));

                if(j == 0 || j == inner.length-1) drctx.curveVertex(newPos.x, newPos.y);

                if(j == inner.length - 1) last = newPos;

                drctx.curveVertex(newPos.x, newPos.y);
            }
            
            if(outer.length > 0){
                drctx.beginContour();
                for(let j=0; j<outer.length-1; j++){
                    let vert        = outer[j];
                    let particle    = particles[vert.z];
                    let pos         = particle.lerpOrigin(lerpOffsetBetweenOandA);
                    let toCenter    = pos.copy().sub(center);
                    let newPos      = center.copy().add(toCenter.copy().mult(multFontSize));

                    if(j == 0 || j == inner.length-1) drctx.curveVertex(newPos.x, newPos.y);

                    drctx.curveVertex(newPos.x, newPos.y);
                }
                drctx.endContour();
            }
            drctx.endShape(drctx.CLOSE);
        }
        drctx.pop();
    }

    p5.getParticlePosition = (index, array) =>{
        let vert        = array[index];
        let particle    = particles[vert.z];
        return particle.lerpOrigin(lerpOffsetBetweenOandA);
    }

    //#region Save/downloader
    p5.saveAsSVG = () => {
        pgsvg.background(255);
        if (isTxtSet) {
            p5.drawShapeFont(pgsvg);
        }
        pgsvg.save("BodyFont_"+Date.now()+".svg");
    }

    p5.saveAsPNG = () => {
        pgpng.background(255);
        if (isTxtSet) {
            p5.drawShapeFont(pgpng);
        }
    }

    p5.setSaving = (state) => {
        if(state){
            capturer.name = "BodyFont_"+Date.now();
            capturer.start();
        }
        else{
            capturer.stop();
            capturer.save();
        }

        saving = state;
    }
    //#endregion

    //#region Debug view
    p5.DebugView = () => {
        if (isSourceDrawn && imageSource != undefined) {
            p5.displaySourceImage();
        }

        if (poses.length > 0 && isBonesDrawn) {
            p5.displaySkeleton();
            p5.displayBones();
        }

        if (fpsDisplayState) {
            p5.displayFPS();
        }

        if(originTypeDisplay){
            p5.displayTypeOrigin();
        }
    }

    p5.displayFPS = () => {
        p5.fill(255);
        p5.noStroke();
        p5.textAlign(p5.CENTER, p5.TOP);
        p5.textSize(12);
        p5.text(`FPS: ${p5.round(p5.frameRate())} — DeltaTime: ${p5.deltaTime}`, p5.width / 2, 20);
    }

    p5.displaySourceImage = () => {
        canvas.drawingContext.drawImage(imageSource, videoParams.isCentered ? videoParams.marginX : 0, 0, videoParams.ctxWidth, videoParams.ctxHeight);
    }

    p5.displayBones = () => {
        p5.noStroke();
        p5.strokeWeight(2);
        p5.fill(255);
        for (let i = 0; i < poses.length; i++) {
            let bone = poses[i];
            let bonePose = p5.createVector(bone.x, bone.y);
            let viz = bone.visibility;

            //display vel
            let lastBone = lastposes[i];
            let lastBonePose = p5.createVector(lastBone.x, lastBone.y);

            let velocity = lastBonePose.copy().sub(bonePose);
            let velDir = velocity.copy();
            velocity.mult(magVelScaleDebug);

            p5.stroke(p5.abs(velDir.x * 255), p5.abs(velDir.y * 255), 0);
            p5.line(bonePose.x, bonePose.y, bonePose.x + velocity.x, bonePose.y + velocity.y);

            if (viz > 0.5) {
                p5.noStroke();
                p5.ellipse(bonePose.x, bonePose.y, 5, 5);
            }
        }

        if (isBonesCentered) {
            p5.stroke(255, 20);
            p5.noFill();
            p5.strokeWeight(1);
            p5.line(p5.width * .5, 0, p5.width * .5, p5.height);
            p5.line(0, p5.height * .5, p5.width, p5.height * .5);
        }
    }

    p5.displaySkeleton = () => {
        p5.strokeWeight(1);
        p5.stroke(255, 50);

        for (let i = 0; i < skeletonDescriptionIndices.length; i += 2) {
            p5.drawBoneBetweenJoint(skeletonDescriptionIndices[i], skeletonDescriptionIndices[i + 1]);
        }
    }

    p5.drawBoneBetweenJoint = (A, B) => {
        p5.line(poses[A].x, poses[A].y, poses[B].x, poses[B].y);
    }

    p5.displayTypeOrigin = () => {
        p5.fill(255);
        for (let i = 0; i < particles.length; i++) {
            let particle = particles[i];
            let toCenter    = particle.position.copy().sub(center);
            let newPos      = center.copy().add(toCenter.copy().mult(multFontSize));
            p5.ellipse(newPos.x, newPos.y, 4, 4);
        }
    }
    //#endregion

    //#region Bones related computation
    p5.setBonesPositionToCanvas = () => {
        for (let i = 0; i < poses.length; i++) {
            let bone = poses[i];
            poses[i].x = bone.x * videoParams.ctxWidth + (videoParams.isCentered ? videoParams.marginX : 0);
            poses[i].y = bone.y * videoParams.ctxHeight;
        }
    }

    p5.centerBones = () => {
        gravityPoint = p5.createVector(0, 0);
        for (let i = 0; i < poses.length; i++) {
            let boneVector = p5.createVector(poses[i].x, poses[i].y);
            gravityPoint.add(boneVector);
        }
        gravityPoint.div(poses.length);

        for (let i = 0; i < poses.length; i++) {
            let bone = poses[i];
            poses[i].x = bone.x - gravityPoint.x + (p5.height * videoParams.aspect) * 0.5 + videoParams.marginX;
            poses[i].y = bone.y - gravityPoint.y + p5.height * 0.5;
        }
    }

    p5.getBonePositionAndVelocity = (index) => {
        let bone = poses[index];
        let position = p5.createVector(bone.x, bone.y);

        //display vel
        let lastBone = lastposes[index];
        let lastBonePose = p5.createVector(lastBone.x, lastBone.y);

        let velocity = lastBonePose.copy().sub(position);

        return { position, velocity };
    }
    //#endregion

    //#region text related computations
    p5.computeCharPoints = () => {
        let chars = p5.split(textToDeform, '');
        let totalPts = 0;
        txtPoints       = [];
        txtBounds       = [];
        txtVert         = [];
        particles       = [];
        
        let totalWidth  = 0
        let maxHeight   = 0;
        for (let i = 0; i < chars.length; i++) {
            let char = chars[i];
            let bounds = p5.computeTextBoundingBox(char);
            let points = p5.computeTextToPoints(char);

            // console.log(char, points, bounds)
            txtBounds.push(bounds);
            txtPoints.push(points);
            totalPts    += points.length;
            totalWidth  += bounds.w;
            maxHeight   = p5.max(maxHeight, bounds.h);
        }
        console.log(`Number of points: ${totalPts}, total width: ${totalWidth}, maxHeight: ${maxHeight}`)

        let startx          = p5.width/2 - totalWidth * .5;
        let starty          = p5.height/2 + maxHeight * .5;
        let letterSpace     = 10;
        let particleIndex   = 0;
        for (let c = 0; c < txtPoints.length; c++) {
            let pts = txtPoints[c];
            let bds = txtBounds[c];
            
            let innerPoints     = [];
            let outerPoints     = [];

            let eyeIndex = -1;
            for (let i = 0; i < pts.length; i++) {
                let p = p5.createVector(pts[i].x, pts[i].y);
                let n = p5.createVector(pts[(i + 1) % pts.length].x,
                    pts[(i + 1) % pts.length].y)
                let dist = p.dist(n);
                if (dist < 10) {
                    //set inner Vector Here
                    let vertex = p5.createVector(p.x + startx, p.y + starty, particleIndex);
                    innerPoints.push(vertex);
                    particles.push(new Particle(p5, vertex.x, vertex.y));
                    particleIndex ++;
                } else {
                    eyeIndex = i + 1;
                    break;
                }
            }
            if (eyeIndex > -1) {
                //console.log(eyeIndex)
                for (let i = eyeIndex; i < pts.length; i++) {
                    let vertex = p5.createVector(pts[i].x + startx, pts[i].y + starty, particleIndex);
                    //set outer Vector here
                    outerPoints.push(vertex);
                    particles.push(new Particle(p5, vertex.x, vertex.y));
                    particleIndex ++;
                }
            }

            txtVert.push({innerPoints, outerPoints});
            startx += bds.w + letterSpace;

            console.log(`Number of innerPoints: ${innerPoints.length}, Number of outerPoints: ${outerPoints.length}`)
        }
        // console.log(`Number of Elements: ${txtVert.length}`)
    }

    p5.computeTextBoundingBox = (textToDeform) => {
        p5.push();
        p5.textAlign(p5.CENTER, p5.CENTER);
        p5.textSize(fontSize);
        let textBBox = font.textBounds(textToDeform, 0, 0);
        p5.pop();
        return textBBox;
    }

    p5.computeTextToPoints = (textToDeform) => {
        p5.push();
        p5.textAlign(p5.CENTER, p5.CENTER);
        let txtPoints = font.textToPoints(textToDeform, 0, 0, fontSize, {
            sampleFactor: txtSampleFactor,
            simplifyThreshold: txtSimplifyThreshold
        });
        p5.pop();

        return txtPoints;
    }

    p5.computeParticleText = (minDist, minVel, velDamp, noiseFreq) => {
        //friction
        let coef = 0.1;
        let normal = 1;
        let frictionMag = coef * normal;
        for (let i = 0; i < particles.length; i++) {
            let particle = particles[i];

            for (let j = 0; j < poses.length; j++) {
                let bone = p5.getBonePositionAndVelocity(j);

                let toBone = particle.position.copy().sub(bone.position);
                if (toBone.mag() <= minDist && bone.velocity.mag() >= minVel) {

                    let noiseX      = p5.noise(particle.position.y * noiseFreq, particle.position.x * noiseFreq, i *noiseFreq) * 2.0 - 1.0;
                    let noiseY      = p5.noise(particle.position.x * noiseFreq, particle.position.y * noiseFreq, i *noiseFreq) * 2.0 - 1.0;
                    let noiseForce  = p5.createVector(noiseX, noiseY);

                    noiseForce.mult(bone.velocity.mag());

                    let newVel = toBone.normalize().mult(bone.velocity.mag() * velDamp);
                   
                    particle.applyForce(newVel);
                    particle.applyForce(noiseForce);
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
        if (isBonesCentered) {
            p5.centerBones();
        }

        if (lastposes == undefined) lastposes = poses; //flag for first frame
    }

    p5.bindImageSource = (source) => {
        imageSource = source;
    }

    p5.setSourceParams = (value) => {
        videoParams = value;
        videoParams.ctxWidth = p5.height * videoParams.aspect;
        videoParams.ctxHeight = p5.height;
        videoParams.isCentered = true;
        videoParams.marginX = (p5.width - videoParams.ctxWidth) * 0.5;
    }

    p5.setDrawSourceState = (state) => {
        isSourceDrawn = state;
    }

    p5.setDrawBonesState = (state) => {
        isBonesDrawn = state;
    }

    p5.setBonesCenteredState = (state) => {
        isBonesCentered = state;
    }

    p5.setFPSDisplayState = (state) => {
        fpsDisplayState = state;
    }

    p5.setTextToDeform = (text) => {
        textToDeform = text;
        if (text.length > 0) {
            // p5.computeTextBoundingBox();
            // p5.computeTextToPoints();

            // particles = [];
            // for (let i = 0; i < txtPoints.length; i++) {
            //     let pt = txtPoints[i];
            //     let x = pt.x - textBBox.w * .5;
            //     let y = pt.y + textBBox.h * .5;
            //     particles.push(new Particle(p5, x, y));
            // }
            p5.computeCharPoints();
            isTxtSet = true;
        } else {
            isTxtSet = false;
        }
    }

    p5.setLerpOffsetBetweenOandA = (value) => {
        lerpOffsetBetweenOandA = value/100.0;
    }

    p5.setMinDistFromBone = (value) =>{
        minDistFromBone = value;
    }

    p5.setMinBoneVel = (value) =>{
        minBoneVel = value;
    }

    p5.setBoneVelDamp = (value) =>{
        boneVelDamp = value;
    }

    p5.setBoneNoiseFreq = (value) =>{
        boneNoiseFreq = value/1000.0;
    }

    p5.setOriginTypeDisplay = (state) =>{
        originTypeDisplay = state;
    }

    p5.setFontSizeMultiplier = (val) => {
        multFontSize = Number(val);
    }
    //#endregion
}
//#endregion

//#region particle class
class Particle {
    constructor(p5, x, y) {
        this.p5ctx = p5;
        this.position       = this.p5ctx.createVector(x, y);
        this.origin         = this.position.copy();
        this.velocity       = this.p5ctx.createVector(0, 0);
        this.acceleration   = this.p5ctx.createVector(0, 0);

        this.maxForce = 0.25;
        this.maxSpeed = 1.0;
        this.radius = 2;
    }

    applyForce(force) {
        //mass could be add using A = F/M
        this.acceleration.add(force);
    }

    dampVelocity() {
        if (this.velocity.mag() <= 0.01) {
            this.velocity.mult(0);
        }
    }

    update() {
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed);
        this.position.add(this.velocity);
        this.acceleration.mult(0);
    }

    lerpOrigin(offset){
        return p5.Vector.lerp(this.origin, this.position, offset);
    }

    display(value) {
        this.p5ctx.ellipse(this.position.x, this.position.y, value, value);
    }
}
//#endregion
