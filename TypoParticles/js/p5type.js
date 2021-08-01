//#region P5 Context
const FontGenerator = (p5) => {
    let  font;
    let  textToDeform;
    let  textBBox;
    let  fontSize = 100;
    let  txtPoints;
    let  isTxtSet = false;
    let  txtSampleFactor = 0.25;
    let  txtSimplifyThreshold = 0;

    let points = [];


    p5.preload = () =>{
        font = p5.loadFont('./fonts/Roboto-Medium.ttf');
    }

    p5.setup = () =>{
        canvas = p5.createCanvas(1280, 720);
        canvas.class('output-canvas');
        p5.setTextToDeform("Hello World")

        //set particles
        for(let i=0; i<txtPoints.length; i++){
            let p = txtPoints[i];
            let x = p.x - textBBox.w * .5;
            let y = p.y + textBBox.h * .5;
            let part = new Particle(p5, x, y);
            points.push(part);
        }
    }

    p5.draw = () =>{
        p5.background(20);

        let mouse       = p5.createVector(p5.mouseX, p5.mouseY);
        let mradius     = 50;
        p5.noFill();
        p5.stroke(255, 0, 0);
        p5.ellipse(mouse.x, mouse.y, mradius * 2, mradius * 2)
        
        p5.noStroke();
        p5.fill(255, 20);
        for(let i=0; i<txtPoints.length; i++){
            let p = txtPoints[i];
            // p5.ellipse(p.x - textBBox.w * .5, p.y + textBBox.h * .5, 2, 2);
        }

        p5.fill(255, 255);
        let coef = 0.1;
        let normal = 1;
        let frictionMag = coef * normal;
        
        for(let i=0; i<points.length; i++){
            let particle = points[i];

            let toMouse = particle.position.copy().sub(mouse);
            if(toMouse.mag() <= mradius){
                particle.applyForce(toMouse);
            }

            let friction = particle.velocity.copy();
            friction.mult(-1);
            friction.normalize();
            friction.mult(frictionMag);
            particle.applyForce(friction);

            particle.update();
            particle.dampVelocity();
            particle.display();
        }
    }

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
    //#endregion

    p5.windowResized = () => {
        p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
    }

    p5.setTextToDeform = (text) =>{
        textToDeform = text;
        if(text.length > 0){
            p5.computeTextBoundingBox();
            p5.computeTextToPoints();
            isTxtSet = true;
        }else{
            isTxtSet = false;
        }
    }
}

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
        if(this.velocity.mag() <= 0.005){
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
var p5CTX = new p5(FontGenerator, 'output');
