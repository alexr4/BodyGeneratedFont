//https://glitch.com/edit/#!/surf-super-aphid?path=script.js%3A1%3A0

const ImgElem               = document.getElementsByClassName("input")[0];
const CanvasElem            = document.getElementsByClassName("output")[0];
const CTX                   = CanvasElem.getContext('2d');
const LandmarkContainer     = document.getElementsByClassName("landmark-grid-container")[0];
const Grid                  = new LandmarkGrid(LandmarkContainer, {
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

//#region HelloWorld
function onResults(result){
    if(!result.poseLandmarks){
        Grid.updateLandmarks([]);
        return;
    }

    CTX.save();
    CTX.clearRect(0, 0, CanvasElem.width, CanvasElem.height);
    CTX.drawImage(result.image, 0, 0, CanvasElem.width, CanvasElem.height);
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
//#endregion

const pose  = new Pose({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
}});

pose.setOptions({
    static_image_mode : false,
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
})

pose.onResults(onResults);

async function UpdateImage(){
    await pose.send({image:ImgElem});
}

UpdateImage();