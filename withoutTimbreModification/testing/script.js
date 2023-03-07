import classNames from "https://cdn.skypack.dev/classnames/bind";
import * as Tone from "https://cdn.skypack.dev/tone";

//get student ID if one is provided
function getUrlParameter(sParam) {
  var sPageUrl = decodeURIComponent(window.location.search.substring(1));
  var sURLVariables = sPageUrl.split('&');
  for (let i = 0; i < sURLVariables.length; i++) {
    let sParameterName = sURLVariables[i].split('=');
    if (sParameterName[0] === sParam) {
      return sParameterName[1] === undefined ? true : sParameterName[1];
    }
  }
};

//generates random student ID if no student ID is provided
function makeId() {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < 8) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

var SONAID = getUrlParameter('id');
if (SONAID === undefined) {
  SONAID = makeId();
}

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
    let synth = new Tone.Synth({
      oscillator: {
        type: "sine",
        partialCount: 64
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

//function for accessing CSV containing the patterns
function loadFile(filePath) {
  var result = null;
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", filePath, false);
  xmlhttp.send();
  if (xmlhttp.status==200) {
    result = xmlhttp.responseText;
  }
  return result;
}

//list of objects, each containing the id for a pattern to be presented and the pattern itself represented as a list
//each list contains notes which are active in each column
//each note is represented by its row e.g. the note at 4,5 in "grid" will be represented by an integer = 4 in pattern[5]
let allPatterns = [];

//helper function for parsing contents of CSV
function createColumnArray(s) {
  let columnArray = [];
  if (s === "x") { return columnArray; }

  for (let i = 0; i < s.length; i++) {
    if (i % 2 == 0) {
      columnArray.push(parseInt(s[i]));
    }
  }
  return columnArray;
}

//open pattern file and parse it as a list of Objects
Papa.parse(loadFile("patterns.csv"), 
{
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    let r = results.data;
    r.forEach((p, pIndex) => {
      let curPId = p.id;

      let curPArray = [];
      curPArray.push(createColumnArray(p.zero));
      curPArray.push(createColumnArray(p.one));
      curPArray.push(createColumnArray(p.two));
      curPArray.push(createColumnArray(p.three));
      curPArray.push(createColumnArray(p.four));
      curPArray.push(createColumnArray(p.five));
      curPArray.push(createColumnArray(p.six));
      curPArray.push(createColumnArray(p.seven));

      allPatterns.push({id: curPId, pattern: curPArray});
    });
  }
});

//shuffle the pattern array so each subject gets random order
for (let i = allPatterns.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i+1));
  [allPatterns[i], allPatterns[j]] = [allPatterns[j], allPatterns[i]]
}

//list of lists; each list is a connection created by the user drawing lines
//e.g. if user connects [0,0] and [1,1], noteConnections will contain [0, 0, 1, 1]
//[note 1 row, note 1 column, note 2 row, note 2 column]
let noteConnections = [];

//this array will contain the data for each trial, each as an object containing user ID, pattern ID, and noteConnections
var data = [];


const synths = makeSynths(6);
//loudness (measured in LUFS) seems to be very similar with same volume values
synths[0].volume.value = 1;
synths[1].volume.value = 1;
synths[2].volume.value = 1;
synths[3].volume.value = 1;
synths[4].volume.value = 1;
synths[5].volume.value = 1;

let beat = 0;
let playing = false;
let started = false;

const oscTypes = ['sine', 'square', 'triangle', 'sawtooth']

const configLoop = () => {

  //notes in the previously played column
  let noteElements = [];

  const repeat = (time) => {
    //reset previously played notes from blue to green
    var seq = document.getElementById('sequencer'),
    rowsElement = seq.getElementsByClassName('sequencer-row');
    for (let i = 0; i < noteElements.length; i++) {
      noteElements[i].classList.add("note-not-playing");
      noteElements[i].classList.remove("note-is-playing");
    }
    noteElements = [];

    document.getElementById('marker' + ((beat+7)%8)).className = 'marker';

    grid.forEach((row, index) => {
      let synth = synths[index];
      let note = row[beat];
      let rowElement = rowsElement[index].getElementsByTagName('*');
      let noteElement = rowElement[beat];
      if (note.isActive) {
        synth.triggerAttackRelease(note.note, "8n", time);
        noteElement.classList.add("note-is-playing");
        noteElement.classList.remove("note-not-playing");
        noteElements.push(noteElement);
      }
    });

    document.getElementById('marker' + beat).className = 'marker-is-active';

    beat = (beat + 1) % 8;
  };

  Tone.Transport.bpm.value = 70;
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
  playButton.addEventListener("click", (e) => {
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
        note.classList.add("note-is-active");
        note.classList.remove("note-not-active");
      }
      else {
        note.classList.add("note-not-active");
        note.classList.remove("note-is-active");
      }
    }
  }
}

function showPattern() {
  sequencerDisplay.style.visibility = 'visible';
  allButtons.style.visibility = 'visible';
}

const configSubmitButton = () => {
  const sButton = document.getElementById("submit-button");
  sButton.addEventListener("click", (e) => {

    data.push({userId: SONAID, patternId: allPatterns[patternI].id, noteConnections: noteConnections});

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
      colors = ["blue", "red"];
  
      patternI += 1;
      curPattern = allPatterns[patternI];
      prepareNewPattern();
      sequencerDisplay.style.visibility = 'hidden';
      allButtons.style.visibility = 'hidden';

      playButton.innerText = "Stop";
      Tone.Transport.start();
      playing = true;

      setTimeout(showPattern, 3000); 
    }
  });
};

const configIdSubmitButton = () => {
  const button = document.getElementById("beginButton");
  button.addEventListener("click", (e) => {
    instructDisplay.style.display = 'none';
    mainDisplay.style.display = 'block';
    
    sequencerDisplay.style.visibility = 'hidden';
    allButtons.style.visibility = 'hidden';

    Tone.start();
    Tone.getDestination().volume.rampTo(-10, 0.001)
    configLoop();
    started = true;

    playButton.innerText = "Stop";
    Tone.Transport.start();
    playing = true;

    setTimeout(showPattern, 3000);
  })
}

const configClearButton = () => {
  const cButton = document.getElementById("clear-button");
  cButton.addEventListener("click", (e) => {
    snapCtx.clearRect(0, 0, 458.667, 344);
    noteConnections = [];
    colors = ["blue", "red"];
  });
};

//the functions below for user-drawn lines are based on: https://prodevhub.com/understanding-canvas-draw-a-line-in-canvas-using-mouse-and-touch-events-in-javascript
const getClientOffset = (event) => {
  const {pageX, pageY} = event.touches ? event.touches[0] : event;
  const x = pageX - drawCanvas.offsetLeft;
  const y = pageY - drawCanvas.offsetTop;

  return {x,y} 
};

const userDrawLine = () => {
  drawCtx.beginPath();
  drawCtx.moveTo(startPosition.x, startPosition.y);
  drawCtx.lineTo(lineCoordinates.x, lineCoordinates.y);
  drawCtx.stroke();
};

const mouseDownListener = (event) => {
  startPosition = getClientOffset(event);
  isDrawStart = true;
};

const mouseMoveListener = (event) => {
  if(!isDrawStart) return;
  
  lineCoordinates = getClientOffset(event);
  drawCtx.clearRect(0, 0, 458.667, 344);

  userDrawLine();
};

//helper function for acceptableConnection, checks if a potential connection has already been made
function connectionExists(c) {
  for (let i = 0; i < noteConnections.length; i++) {
    let existingC = noteConnections[i];
    // if (c[0] == existingC[0] && c[1] == existingC[1] && c[2] == existingC[2] && c[3] == existingC[3]) {
    if (c.startNote[0] == existingC.startNote[0] && c.startNote[1] == existingC.startNote[1] && c.endNote[0] == existingC.endNote[0] && c.endNote[1] == existingC.endNote[1]) {
      return true;
    }
    // if (c[0] == existingC[2] && c[1] == existingC[3] && c[2] == existingC[0] && c[3] == existingC[1]) {
    if (c.startNote[0] == existingC.endNote[0] && c.startNote[1] == existingC.endNote[1] && c.endNote[0] == existingC.startNote[0] && c.endNote[1] == existingC.startNote[1]) {
      return true;
    }
  }
  return false;
}

//helper function for acceptableConnection, checks if potential connection is connecting a note to itself
function isSameNote(c) {
  if (c.startNote[0] == c.endNote[0] && c.startNote[1] == c.endNote[1]) {
    return true;
  }
  return false;
}

//helper function for acceptableConnection, checks if notes in connection are in same column
function sameColumn(c) {
  if (c.startNote[1] == c.endNote[1]) {
    return true;
  }
  return false;
}

//helper function for mouseupListener, checks multiple conditions to determine if new connection can be added
function acceptableConnection(c) {
  return !connectionExists(c) && !isSameNote(c) && !sameColumn(c);
}

//helper function for getLineColor, for checking if points are the same
function equalArrays(a, b) {
  if (a[0] == b[0] && a[1] == b[1]) {
    return true;
  }
  return false;
}

//called when a connection is made from red-blue or vice versa, makes all lines red
function allLinesRed() {
  snapCtx.clearRect(0, 0, 458.667, 344);
  snapCtx.fillStyle = "red";
  snapCtx.strokeStyle = "red";
  for (let i = 0; i < noteConnections.length; i++) {
    noteConnections[i].color = "red";
    snapDrawLine(28 + 57.5 * noteConnections[i].startNote[1], 28 + 57.5 * noteConnections[i].startNote[0], 28 + 57.5 * noteConnections[i].endNote[1], 28 + 57.5 * noteConnections[i].endNote[0]);
  }
  colors = ["blue"];
}

//function which returns the color of a given connection, both for drawing the line and recording which pattern it belongs to
function getLineColor(c) {
  let colorList = []; 
  for (let i = 0; i < noteConnections.length; i++) {
    let existingC = noteConnections[i];
    if (equalArrays(c.startNote, existingC.startNote) || equalArrays(c.startNote, existingC.endNote) || equalArrays(c.endNote, existingC.startNote) || equalArrays(c.endNote, existingC.endNote)) {
      colorList.push(existingC.color);
    }
  } 

  if (colorList.length == 0) {
    return colors.pop();
  }
  else {
    if (colorList.includes("red") && colorList.includes("blue")) {
      allLinesRed();
      return "red";
    }
    else {
      return colorList[0];
    }
  }
}

const mouseupListener = (event) => {
  let startNote = getClosestNote(startPosition.x, startPosition.y);
  let endNote = getClosestNote(lineCoordinates.x, lineCoordinates.y);
  let possibleConnection = {startNote: [startNote[0].row, startNote[0].column], endNote: [endNote[0].row, endNote[0].column], color: "red"};

  if (startNote[1] == true && endNote[1] == true && acceptableConnection(possibleConnection)) {
    possibleConnection.color = getLineColor(possibleConnection);
    snapCtx.fillStyle = possibleConnection.color;
    snapCtx.strokeStyle = possibleConnection.color;
    if (startNote[0].column > endNote[0].column) {
      snapDrawEndLine(startNote[0].canvasX, startNote[0].canvasY, endNote[0].canvasX, endNote[0].canvasY);
    }
    else {
      snapDrawLine(startNote[0].canvasX, startNote[0].canvasY, endNote[0].canvasX, endNote[0].canvasY);
    }
    noteConnections.push(possibleConnection);
    console.log(noteConnections);
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

//alternate version of snapDrawLine for connecting last note in melody to first
function snapDrawEndLine(x1, y1, x2, y2) {
  let yMidPoint = (y1+y2)/2;
  snapCtx.beginPath();
  snapCtx.moveTo(x1, y1);
  snapCtx.lineTo(458, yMidPoint);
  snapCtx.stroke();
  snapCtx.closePath();

  snapCtx.beginPath();
  snapCtx.moveTo(0, yMidPoint);
  snapCtx.lineTo(x2, y2);
  snapCtx.stroke();
  snapCtx.closePath();
}

//setting up the canvas on which the user draws lines
var drawCanvas = document.getElementById("c1");
var drawCtx = drawCanvas.getContext("2d");
drawCanvas.width = drawCanvas.offsetWidth;
drawCanvas.height = drawCanvas.offsetHeight;
drawCtx.fillStyle = "gray";
drawCtx.strokeStyle = "gray";
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
var colors = ["blue", "red"];
snapCtx.lineWidth = 2;


let patternI = 0;
let curPattern = allPatterns[patternI];

var mainDisplay = document.getElementById("mainDisplay");
var instructDisplay = document.getElementById("instructions");
mainDisplay.style.display = 'none';
var sequencerDisplay = document.getElementById("sequencerDisplay");
var allButtons = document.getElementById("allButtons");
var playButton = document.getElementById("play-button");



window.addEventListener("DOMContentLoaded", () => {
  configPlayButton();
  configSubmitButton();
  configClearButton();
  makeMarkerSpace();
	makeSequencer();
  prepareNewPattern();
  configIdSubmitButton();
});