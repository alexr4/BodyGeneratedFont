//#region Init DOM elements
var p5FontGenerator = new p5(FontGenerator, 'output');

//Load all other CTX elem
const CONTAINER = document.getElementById("main-debug");
const INPUT = document.getElementById('upload');
const LNDMKR = document.getElementsByClassName("landmark-grid-container")[0];
const Grid = new LandmarkGrid(LNDMKR, {
    connectionColor: 0xCCCCCC,
    definedColors:
        [{ name: 'LEFT', value: 0xffa500 }, { name: 'RIGHT', value: 0x00ffff }],
    range: 2,
    fitToGrid: true,
    labelSuffix: 'm',
    landmarkSize: 2,
    numCellsPerAxis: 4,
    showHidden: false,
    centered: true,
});

var video;

//#endregion

//#region init BlazePose
const pose = new Pose({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
    }
});

pose.setOptions({
    selfieMode: false,
    modelComplexity: 2,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
})
pose.onResults(onResults);
//#endregion

//#region init Video Selector
INPUT.addEventListener('change', function (event) {
    p5FontGenerator.setReady(false);
    p5FontGenerator.setLoading(true);
    pose.reset();

    var file = this.files[0];
    var url = URL.createObjectURL(file);

    //load video
    if (video == undefined) {
        video = document.createElement('video');
        video.src = url;
        video.muted = true;
        video.autoplay = true;
        video.loop = true;
        video.width = CONTAINER.clientWidth;
        CONTAINER.appendChild(video);
        video.addEventListener('play', computeFrame);
    } else {
        video.pause();
        video.src = url;
        video.load();
    }

    
    bindDOMParamToP5Instance();
    video.addEventListener('canplay', initVideo);
    video.addEventListener("loadedmetadata", defineAspectRatio)
});

function initVideo() {
    // console.log("video ready to play");
    video.play();
}

function defineAspectRatio() {
    // console.log(`Canvas resized at ${this.videoWidth}×${this.videoHeight}`)
    let aspect = this.videoWidth / this.videoHeight;
    p5FontGenerator.setSourceParams({
        width: this.videoWidth,
        height: this.videoHeight,
        aspect: aspect
    });
}

async function computeFrame() {
    try {
        // console.log("video plays");
        await pose.send({ image: video });
        window.requestAnimationFrame(computeFrame)
    } catch (error) {
        // console.error(error);
        // ! This throws an error when we change source due to the async func. 
        //** To avoid stay on thois error we reset pose when we get this error but also to resync the mode; with the new source
        pose.reset();
    }
}
//#endregion

//#region bind blaze pose to P5
function onResults(result) {
    if (!result.poseLandmarks) {
        Grid.updateLandmarks([]);
        return;
    }

    p5FontGenerator.setReady(true);
    p5FontGenerator.bindImageSource(video);
    p5FontGenerator.bindSkeleton(result.poseLandmarks);

    Grid.updateLandmarks(result.poseWorldLandmarks, POSE_CONNECTIONS, [
        { list: Object.values(POSE_LANDMARKS_LEFT), color: 'LEFT' },
        { list: Object.values(POSE_LANDMARKS_RIGHT), color: 'RIGHT' },
    ]);
}
//#endregion

//#region bind UI state to p5
window.onload = function () {
    bindDOMParamToP5Instance();
}

function bindDOMParamToP5Instance() {
    $("#displayVideoOnCanvas").on('input', function () {
        p5FontGenerator.setDrawSourceState(this.checked);
    })

    $("#displayBonesOnCanvas").on('input', function () {
        p5FontGenerator.setDrawBonesState(this.checked);
    })

    $("#CenterBonesOnCanvas").on('input', function () {
        p5FontGenerator.setBonesCenteredState(this.checked);
    })

    $("#ShowFPS").on('input', function () {
        p5FontGenerator.setFPSDisplayState(this.checked);
    })

    $("#TextToGenerate").keyup(function () {
        p5FontGenerator.setTextToDeform($(this).val())
    });
}
//#endregion

