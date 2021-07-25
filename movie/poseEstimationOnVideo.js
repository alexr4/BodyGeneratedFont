const CONTAINER     = document.getElementsByClassName("container")[0];
const INPUT         = document.getElementById('upload');
const CANVAS        = document.getElementsByClassName("output")[0];
const CTX           = CANVAS.getContext('2d');
const LNDMKR        = document.getElementsByClassName("landmark-grid-container")[0];
const Grid          = new LandmarkGrid(LNDMKR, {
    connectionColor: 0xCCCCCC,
    definedColors:
        [{name: 'LEFT', value: 0xffa500}, {name: 'RIGHT', value: 0x00ffff}],
    range: 2,
    fitToGrid: true,
    labelSuffix: 'm',
    landmarkSize: 2,
    numCellsPerAxis: 4,
    showHidden: false,
    centered: true,
  });
var video;
const pose  = new Pose({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
}});

pose.setOptions({
    selfieMode: false,
    modelComplexity: 2,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
})
pose.onResults(onResults); 

INPUT.addEventListener('change', function(event) {
    // const pose  = new Pose({locateFile: (file) => {
    //     return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
    // }});
    pose.reset();

    var file = this.files[0];
    var url = URL.createObjectURL(file);
    
    //load video
    if(video == undefined)
    {
        video           = document.createElement('video');
        video.src       = url;
        video.muted     = true;
        video.autoplay  = true;
        video.loop      = true;

        CONTAINER.appendChild(video);
        video.addEventListener('play', computeFrame);
    }else{
        video.pause();
        video.src       = url;
        video.load();
    }
    
    video.addEventListener('canplay', initVideo);
    video.addEventListener("loadedmetadata", setCanvasSize)
});

function initVideo(){
    // console.log("video ready to play");
    video.play();
}

function setCanvasSize(){
    // console.log(`Canvas resized at ${this.videoWidth}×${this.videoHeight}`)
    CANVAS.width    = this.videoWidth;
    CANVAS.height   = this.videoHeight;
}

async function computeFrame(){
    try{
        // console.log("video plays");
        await pose.send({image:video});
        window.requestAnimationFrame(computeFrame)
    }catch(error){
        // console.error(error);
        // ! This throws an error when we change source due to the async func. 
        //** To avoid stay on thois error we reset pose when we get this error but also to resync the mode; with the new source
        pose.reset();
    }
}

// BLAZE POSE
function onResults(result){
    if(!result.poseLandmarks){
        Grid.updateLandmarks([]);
        return;
    }

    CTX.save();
    CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);
    // CTX.drawImage(result.image, 0, 0, CANVAS.width, CANVAS.height);
    CTX.drawImage(video, 0, 0, CANVAS.width, CANVAS.height);
    //drawConnectors(CTX, result.poseLandmarks, POSE_CONNECTIONS, {color:'#00FF00', lineWidth: 4});
    //drawLandmarks(CTX, result.poseLandmarks,  {color:'#FF0000', lineWidth: 2});

    drawConnectors(CTX, result.poseLandmarks, POSE_CONNECTIONS, {visibilityMin: 0.65, color: 'white', lineWidth: 4});
    drawLandmarks(CTX, Object.values(POSE_LANDMARKS_LEFT).map(index => result.poseLandmarks[index]), {visibilityMin: 0.65, color: 'white', fillColor: 'rgb(255,138,0)', lineWidth: 2});
    drawLandmarks(CTX, Object.values(POSE_LANDMARKS_RIGHT).map(index => result.poseLandmarks[index]), {visibilityMin: 0.65, color: 'white', fillColor: 'rgb(0,217,231)', lineWidth: 2});
    drawLandmarks(CTX, Object.values(POSE_LANDMARKS_NEUTRAL).map(index => result.poseLandmarks[index]), {visibilityMin: 0.65, color: 'white', fillColor: 'white', lineWidth: 2});
    CTX.restore();

    Grid.updateLandmarks(result.poseWorldLandmarks, POSE_CONNECTIONS, [
        {list: Object.values(POSE_LANDMARKS_LEFT), color: 'LEFT'},
        {list: Object.values(POSE_LANDMARKS_RIGHT), color: 'RIGHT'},
      ]);
}