import classNames from "https://cdn.skypack.dev/classnames/bind";
import * as Tone from "https://cdn.skypack.dev/tone";

const makeSynths = (count) => {
  // declare array to store synths
  const synths = [];

  // each synth can only play one note at a time.
  // for simplicity, we'll create one synth for each note available
  // this allows for easy polyphony (multiple notes playing at the same time)

	// I'll be using a one octive F minor pentatonic scale
  // so I'll need 6 synths
  for (let i = 0; i < count; i++) {
    // Documentation for Tone.Synth can be found here:
    // https://tonejs.github.io/docs/r13/Synth

    // I'm using an oscillator with a square wave and 8 partials
    // because I like how it sounds.
    //
    // You could simply declare new Tone.Synth().toDestination()
    //
    // This would work just as well, but sound slightly different.
    // Demo different oscillator settings here:
    // https://tonejs.github.io/examples/oscillator
    let synth = new Tone.Synth({
      oscillator: {
        type: "square",
        partialCount: 8
      }
    }).toDestination();
   
   
    synths.push(synth);
  }

  return synths;
};

const makeGrid = (notes) => {
  // our "notation" will consist of an array with 6 sub arrays
  // each sub array corresponds to one row in our sequencer grid

  // parent array to hold each row subarray
  const rows = [];

  var rowI = 0;
  var yCoord = 28;

  for (const note of notes) {
    // declare the subarray
    const row = [];
    // each subarray contains multiple objects that have an assigned note
    // and a boolean to flag whether they are "activated"
    // each element in the subarray corresponds to one eigth note

    var xCoord = 28;

    for (let i = 0; i < 8; i++) {
      row.push({
        note: note,
        isActive: false,
        row: rowI,
        column: i,
        canvasX: xCoord, 
        canvasY: yCoord
      });

      xCoord += 57.5;
    }
    rows.push(row);

    rowI += 1;
    yCoord += 57.5;
  }

  // we now have 6 rows each containing 16 eighth notes
  return rows;
};


// declaring the notes for each row
// 349.23, 311.13, 261.63, 233.08, 207.65, 174.61 based on https://www.omnicalculator.com/other/note-frequency
const notes = ["F4", "Eb4", "C4", "Bb3", "Ab3", "F3"];
let grid = makeGrid(notes);

//list of objects, each containing the id for a pattern to be presented and the pattern itself represented as a list
//each list contains notes which are active in each column
//each note is represented by its row e.g. the note at 4,5 in "grid" will be represented by an integer = 4 in pattern[5]
let allPatterns = [{id: 1, pattern: [[0],[0],[0],[0],[0],[0],[0],[0]]},
                   {id: 2, pattern: [[5],[4],[5],[4],[3,5],[],[],[]]},
                   {id: 3, pattern: [[0],[1],[2],[3],[4],[5],[4],[3]]}];

//list of lists; each list is a connection created by the user drawing lines
//e.g. if user connects [0,0] and [1,1], noteConnections will contain [0, 0, 1, 1]
//[note 1 row, note 1 column, note 2 row, note 2 column]
let noteConnections = [];

//this array will contain the data for each trial, each as an object containing user ID, pattern ID, and noteConnections
var data = [];


const synths = makeSynths(6);
// volume values determined by taking values from a 40 phon perceived loudness curve (https://williamssoundstudio.com/tools/iso-226-equal-loudness-calculator-fletcher-munson.php),
// scaling each db value down by subtracting 40, and then using linear interpolation to get db values for each of the frequencies in the notes list.
// comment these lines out to get equal volume for each frequency
synths[0].volume.value = 0.003;
synths[1].volume.value = 0.003;
synths[2].volume.value = 0.001;
synths[3].volume.value = 11.42;
synths[4].volume.value = 12.95;
synths[5].volume.value = 15.50;

let beat = 0;
let playing = false;
let started = false;

const oscTypes = ['sine', 'square', 'triangle', 'sawtooth']

const configLoop = () => {

  const repeat = (time) => {
    document.getElementById('marker' + ((beat+7)%8)).className = 'marker';
    grid.forEach((row, index) => {
      let synth = synths[index];
      let note = row[beat];
      if (note.isActive) {
        synth.triggerAttackRelease(note.note, "8n", time);
      }
    });

    document.getElementById('marker' + beat).className = 'marker-is-active';

    beat = (beat + 1) % 8;
  };

  Tone.Transport.bpm.value = 90;
  Tone.Transport.scheduleRepeat(repeat, "8n");
};

const makeSequencer = () => {
  const sequencer = document.getElementById("sequencer");
  grid.forEach((row, rowIndex) => {
    const seqRow = document.createElement("div");
    seqRow.id = `rowIndex`;
    seqRow.className = "sequencer-row";

    row.forEach((note, noteIndex) => {
      const button = document.createElement("button");
      button.className = "note"

      seqRow.appendChild(button);
    });
    sequencer.appendChild(seqRow);
  });
};

const makeMarkerSpace = () => {
  const markerSpace = document.getElementById("markerSpace");
  const markerRow = document.createElement('div');
  markerRow.className = 'marker-row'
  for (let i = 0; i < 8; i++) {
    const marker = document.createElement("button");
    marker.id = 'marker' + i;
    marker.className = "marker";
    markerRow.appendChild(marker);
  }
  markerSpace.appendChild(markerRow);
};

const configPlayButton = () => {
  const button = document.getElementById("play-button");
  button.addEventListener("click", (e) => {
    if (!started) {
      Tone.start();
      Tone.getDestination().volume.rampTo(-10, 0.001)
      configLoop();
      started = true;
    }

    if (playing) {
      e.target.innerText = "Play";
      Tone.Transport.stop();
      playing = false;
    } else {
      e.target.innerText = "Stop";
      Tone.Transport.start();
      playing = true;
    }
  });
};

//helper function for configSubmitButton, updates activity values for each note when 
//presenting the next pattern for the user. Is also called at initialization
function prepareNewPattern() {
  //set each active note class for audio
  grid.forEach((row, rowIndex) => {
    row.forEach((note, noteIndex) => {
      if (curPattern.pattern[noteIndex].includes(rowIndex)) {
        note.isActive = true;
      }
      else {
        note.isActive = false;
      }
    });
  });

  //set each active note class for display
  var seq = document.getElementById('sequencer'),
  rows = seq.getElementsByClassName('sequencer-row');
  
  for (let rowIndex = 0; rowIndex < 6; rowIndex++) {
    let row = rows[rowIndex].getElementsByTagName('*');
    for (let noteIndex = 0; noteIndex < 8; noteIndex++) {
      let note = row[noteIndex]
      if (grid[rowIndex][noteIndex].isActive == true) {
        note.className = classNames(
          "note",
          {"note-is-active": true},
          {"note-not-active": false}
        );
      }
      else {
        note.className = classNames(
          "note",
          {"note-is-active": false},
          {"note-not-active": true}
        );
      }
    }
  }
}



const configSubmitButton = () => {
  const sButton = document.getElementById("submit-button");
  sButton.addEventListener("click", (e) => {

    //"test" used as userId as placeholder, will be replaced with user info
    data.push({userId: "test", patternId: allPatterns[patternI].id, noteConnections: noteConnections});

    //once subject has gone through all patterns, submit their data
    if (patternI >= allPatterns.length - 1) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', 'php/save_json.php');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify({ filedata: JSON.stringify(data) }));

      //screen which informs the user that the experiment has ended
      document.body.innerHTML = "";
      const p = document.createElement("p");
      p.classList.add("infoText");
      const node = document.createTextNode("The experiment has concluded and your responses have been recorded. Thank you for participating!");
      p.appendChild(node);
      document.body.appendChild(p);
    }

    //otherwise present next pattern
    else {
      drawCtx.clearRect(0, 0, 458.667, 344);
      snapCtx.clearRect(0, 0, 458.667, 344);
      noteConnections = [];
  
      patternI += 1;
      curPattern = allPatterns[patternI];
      prepareNewPattern();
    }
  });
}

const configClearButton = () => {
  const cButton = document.getElementById("clear-button");
  cButton.addEventListener("click", (e) => {
    snapCtx.clearRect(0, 0, 458.667, 344);
    noteConnections = [];
  });
}


//the functions below for user-drawn lines are based on: https://prodevhub.com/understanding-canvas-draw-a-line-in-canvas-using-mouse-and-touch-events-in-javascript
const getClientOffset = (event) => {
  const {pageX, pageY} = event.touches ? event.touches[0] : event;
  const x = pageX - drawCanvas.offsetLeft;
  const y = pageY - drawCanvas.offsetTop;

  return {x,y} 
}

const userDrawLine = () => {
  drawCtx.beginPath();
  drawCtx.moveTo(startPosition.x, startPosition.y);
  drawCtx.lineTo(lineCoordinates.x, lineCoordinates.y);
  drawCtx.stroke();
}

const mouseDownListener = (event) => {
  startPosition = getClientOffset(event);
  isDrawStart = true;
}

const mouseMoveListener = (event) => {
  if(!isDrawStart) return;
  
  lineCoordinates = getClientOffset(event);
  drawCtx.clearRect(0, 0, 458.667, 344);

  userDrawLine();
}

//helper function for acceptableConnection, checks if a potential connection has already been made
function connectionExists(c) {
  for (let i = 0; i < noteConnections.length; i++) {
    let existingC = noteConnections[i];
    if (c[0] == existingC[0] && c[1] == existingC[1] && c[2] == existingC[2] && c[3] == existingC[3]) {
      return true;
    }
    if (c[0] == existingC[2] && c[1] == existingC[3] && c[2] == existingC[0] && c[3] == existingC[1]) {
      return true;
    }
  }
  return false;
}

//helper function for acceptableConnection, checks if potential connection is connecting a note to itself
function isSameNote(c) {
  if (c[0] == c[2] && c[1] == c[3]) {
    return true;
  }
  return false;
}

//helper function for acceptableConnection, checks if notes in connection are in same column
function sameColumn(c) {
  if (c[1] == c[3]) {
    return true;
  }
  return false;
}

//helper function for mouseupListener, checks multiple conditions to determine if new connection can be added
function acceptableConnection(c) {
  return !connectionExists(c) && !isSameNote(c) && !sameColumn(c);
}

const mouseupListener = (event) => {
  let startNote = getClosestNote(startPosition.x, startPosition.y);
  let endNote = getClosestNote(lineCoordinates.x, lineCoordinates.y);
  let possibleConnection = [startNote[0].row, startNote[0].column, endNote[0].row, endNote[0].column];

  if (startNote[1] == true && endNote[1] == true && acceptableConnection(possibleConnection)) {
    snapDrawLine(startNote[0].canvasX, startNote[0].canvasY, endNote[0].canvasX, endNote[0].canvasY);
    noteConnections.push(possibleConnection);
  }
  drawCtx.clearRect(0, 0, 458.667, 344);


  isDrawStart = false;
}


//below are the functions relating to the line which is snapped to the grid and drawn after the user draws a line
function getClosestNote(x, y) {
  let minDistance = Number.POSITIVE_INFINITY;
  let closestPoint = [null, false];
  curPattern.pattern.forEach((column, columnIndex) => {
    column.forEach((row, rowIndex) => {
      let curNote = grid[row][columnIndex];
      let distance = Math.sqrt((curNote.canvasX-x)*(curNote.canvasX-x) + (curNote.canvasY-y)*(curNote.canvasY-y));
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = [curNote, false];
      }
    });
  });

  //if the minDistance is within the space of an active note...
  if (minDistance < 27) {
    closestPoint[1] = true;
  }
  return closestPoint;
}

function snapDrawLine(x1, y1, x2, y2) {
  snapCtx.beginPath();
  snapCtx.moveTo(x1, y1);
  snapCtx.lineTo(x2, y2);
  snapCtx.stroke();
  snapCtx.closePath();
}

//setting up the canvas on which the user draws lines
var drawCanvas = document.getElementById("c1");
var drawCtx = drawCanvas.getContext("2d");
drawCanvas.width = drawCanvas.offsetWidth;
drawCanvas.height = drawCanvas.offsetHeight;
drawCtx.fillStyle = "red";
drawCtx.strokeStyle = "red";
drawCtx.lineWidth = 5;
drawCanvas.addEventListener('mousedown', mouseDownListener);
drawCanvas.addEventListener('mousemove', mouseMoveListener);
drawCanvas.addEventListener('mouseup', mouseupListener);
drawCanvas.addEventListener('touchstart', mouseDownListener);
drawCanvas.addEventListener('touchmove', mouseMoveListener);
drawCanvas.addEventListener('touchend', mouseupListener);

let startPosition = {x: 0, y: 0};
let lineCoordinates = {x: 0, y: 0};
let isDrawStart = false;

//setting up the canvas which will draw the connections made by the user, but with the lines snapped to notes
var snapCanvas = document.getElementById("c2");
var snapCtx = snapCanvas.getContext("2d");
snapCanvas.width = snapCanvas.offsetWidth;
snapCanvas.height = snapCanvas.offsetHeight;
snapCtx.fillStyle = "red";
snapCtx.strokeStyle = "red";
snapCtx.lineWidth = 2;


let patternI = 0;
let curPattern = allPatterns[patternI];

window.addEventListener("DOMContentLoaded", () => {
  configPlayButton();
  configSubmitButton();
  configClearButton();
  makeMarkerSpace();
	makeSequencer();
  prepareNewPattern();
});