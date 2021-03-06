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
var pose = new Pose({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.4.1624666670/${file}`;
    }
});

var options = {
    selfieMode: false,
    modelComplexity: 0,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
};

pose.setOptions(options);

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
        video.setAttribute("controls","controls") 
        CONTAINER.appendChild(video);
        video.addEventListener('play', computeFrame);
    } else {
        video.pause();
        video.src = url;
        video.load();
    }

    video.addEventListener('canplay', initVideo);
    video.addEventListener("loadedmetadata", defineAspectRatio)
});

function initVideo() {
    // console.log("video ready to play");
    video.play();
}

function defineAspectRatio() {
    // console.log(`Canvas resized at ${this.videoWidth}??${this.videoHeight}`)
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
        console.error(error);
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

$(document).ready(() => {

    //set default
     $('input[type="range"]').each(function() {
        
        var control = $(this),
          controlMin = control.attr('min'),
          controlMax = control.attr('max'),
          controlVal = control.val(),
          controlID  = control.attr('id'),
          controlThumbWidth = control.data('thumbwidth');
        
        var range = controlMax - controlMin;
        
        var position = ((controlVal - controlMin) / range) * 100;
        var positionOffset = Math.round(controlThumbWidth * position / 100) - (controlThumbWidth / 2);
        var output = $(`[foroutput=${controlID}]`);
        
        output
          .css('left', 'calc(' + position + '% - ' + positionOffset + 'px)')
          .text(controlVal);
      
      });

    // p5FontGenerator.setTextToDeform($("#TextToGenerate").val())
    p5FontGenerator.setDrawSourceState($("#displayVideoOnCanvas").prop("checked"));
    p5FontGenerator.setDrawBonesState($("#displayBonesOnCanvas").prop("checked"));
    p5FontGenerator.setBonesCenteredState($("#CenterBonesOnCanvas").prop("checked"));
    p5FontGenerator.setFPSDisplayState($("#ShowFPS").prop("checked"));
    p5FontGenerator.setOriginTypeDisplay($("#displayOriginalTextPoint").prop("checked"));
    p5FontGenerator.setLerpOffsetBetweenOandA($("#lerpWithOrigin").val());
    p5FontGenerator.setMinDistFromBone($("#minDist").val());
    p5FontGenerator.setMinBoneVel($("#maxVel").val());
    p5FontGenerator.setBoneVelDamp($("#velDamp").val());
    p5FontGenerator.setBoneNoiseFreq($("#noiseFreq").val()); 
    p5FontGenerator.setFontSizeMultiplier($("#fontSizeMultiplier").val()); 
})



function bindDOMParamToP5Instance() {
    console.log("Bind data to p5js drawing context")

    //#region  Text to generate
    $("#TextToGenerate").keyup(function () {
        p5FontGenerator.setTextToDeform($(this).val())
    });

    $("#modelComplexity").on('input', function () {
        try{
            if(p5FontGenerator.ready){
                p5FontGenerator.setReady(false);
            }
            if(p5FontGenerator.loading){
                p5FontGenerator.setLoading(true);
            }
            options.modelComplexity = Number($(this).val());
            pose.setOptions(options);
            pose.reset();
        }catch(err){
            console.error('bindDOMParamToP5Instance ', err)
        }
        
    })
    //#endregion

    //#region Global Blaze Params
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
    //#endregion

    //#region Type parameters
    $("#displayOriginalTextPoint").on('input', function () {
        p5FontGenerator.setOriginTypeDisplay(this.checked);
    })

    $("#lerpWithOrigin").on('input', function () {
        p5FontGenerator.setLerpOffsetBetweenOandA($(this).val());
    })
    
    $("#minDist").on('input', function () {
        p5FontGenerator.setMinDistFromBone($(this).val());
    })

    $("#maxVel").on('input', function () {
        p5FontGenerator.setMinBoneVel($(this).val());
    })

    $("#velDamp").on('input', function () {
        p5FontGenerator.setBoneVelDamp($(this).val());
    })

    $("#noiseFreq").on('input', function () {
        p5FontGenerator.setBoneNoiseFreq($(this).val());
    })

    $("#fontSizeMultiplier").on('input', function () {
        p5FontGenerator.setFontSizeMultiplier($(this).val());
    })

    $("#reloadAnimation").on('click', function () {
        console.log("reloadAnimation clicked")
        p5FontGenerator.setTextToDeform($("#TextToGenerate").val());
    })
    //#endregion

    //#region downloader
    $("#DownloadSVG").on('click', function () {
        p5FontGenerator.saveAsSVG();
        console.log(`DownloadSVG clicked`);
    })

    $("#DownloadSequences").on('click', function () {
        console.log(`DownloadSequences clicked`)

        $(this).removeClass("active");
        $(this).addClass("inactive");
        $("#StopDownloadSequences").removeClass("inactive");
        $("#StopDownloadSequences").addClass("active");

        p5FontGenerator.setSaving(true);
    })
    
    $("#StopDownloadSequences").on('click', function () {
        console.log(`StopDownloadSequences clicked`)
        
        $(this).removeClass("active");
        $(this).addClass("inactive");
        $("#DownloadSequences").removeClass("inactive");
        $("#DownloadSequences").addClass("active");

        p5FontGenerator.setSaving(false);
    })
    //#endregion

    //range bubble
    $('input[type="range"]').on('input', function() {
        
        var control = $(this),
          controlMin = control.attr('min'),
          controlMax = control.attr('max'),
          controlVal = control.val(),
          controlID  = control.attr('id'),
          controlThumbWidth = control.data('thumbwidth');
        
        var range = controlMax - controlMin;
        
        var position = ((controlVal - controlMin) / range) * 100;
        var positionOffset = Math.round(controlThumbWidth * position / 100) - (controlThumbWidth / 2);
        var output = $(`[foroutput=${controlID}]`);
        
        output
          .css('left', 'calc(' + position + '% - ' + positionOffset + 'px)')
          .text(controlVal);
      
      });
}
//#endregion

