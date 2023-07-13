import classNames from "https://cdn.skypack.dev/classnames/bind";
import * as Tone from "https://cdn.skypack.dev/tone";

let allTrials;
let allPatterns = [];

const trialDataFiles = ['subject-64230e56b12f5.json', 'subject-642607e6d8f0d.json', 'subject-64262a26f12e6.json', 'subject-6426ec7bb1c99.json', 'subject-642a3c5be053d.json', 'subject-642c6720012d5.json', 'subject-642cdd56614ac.json', 'subject-642d089c7bdce.json', 'subject-642dd5507e122.json', 'subject-642de2d7dd7c3.json', 'subject-642df61daa640.json', 'subject-642e0a5ba4912.json', 'subject-642e13c1a50b0.json', 'subject-6434cd3788e16.json', 'subject-6435a5f92196c.json', 'subject-6436e01865914.json', 'subject-6436e741b62b4.json', 'subject-6436ece7e23f5.json', 'subject-64381ab93fbbd.json', 'subject-643825af0bb95.json', 'subject-643826af50871.json', 'subject-64384bbb95a05.json', 'subject-6438b4629c8e5.json', 'subject-643d9f4d9c975.json', 'subject-643dd821cf38e.json', 'subject-643ddb60480e9.json', 'subject-643eb950008bc.json', 'subject-643ebda2e947d.json', 'subject-643ef4f2c9c94.json', 'subject-643efca62e376.json', 'subject-643efe82376d2.json', 'subject-643f21010e5ed.json', 'subject-643f34d2168ab.json', 'subject-643f3b917c7d7.json', 'subject-643f4fd0771a2.json', 'subject-6440e24b32257.json', 'subject-644193836f4a1.json', 'subject-6441aa219a707.json', 'subject-6441d390d0c85.json', 'subject-6441ff8b6d07b.json', 'subject-6442835edf541.json', 'subject-6442c267d3007.json', 'subject-6442d46f4b5a2.json', 'subject-6442f148b7dce.json', 'subject-6442f94949ff4.json', 'subject-6446bb45e2fe1.json', 'subject-6446ebdb181bb.json', 'subject-6446f9d4be4a1.json', 'subject-64470c76454cf.json', 'subject-644808fa468b9.json', 'subject-6448218c9f16a.json', 'subject-64484a38df520.json', 'subject-6448502784c00.json', 'subject-64489849c0435.json', 'subject-64489c3b5dc8c.json', 'subject-6448a1b9ca8f2.json', 'subject-64496e5f1525f.json', 'subject-6449ac0b09637.json', 'subject-6449ac35ef433.json', 'subject-6449bce10333d.json', 'subject-6449bf9f06685.json', 'subject-6449c54688c78.json', 'subject-6449c90419ef8.json', 'subject-6449ca6894a6e.json'];
const trialNames = ['goodContinuation2','pitchProx5','repVsPitchHiLo2','repVsPitchLoHi2','loRepHiCont','hiRepLoContBegMissing','pitchProximity2','commonFate1','salience1','salience2','priority4','loRepHiContBegEndMissing','loRepHiContBegMissing','hiRepLoContEndMissing','alternateVsMountain1','repVsPitchLoHi','competition2','goodContinuation1','hiRepLoCont','competition1','hiRepLoContBegEndMissing','priority3','pitchProx3','AlternateVsMountain4','pitchProx6','pitchProx4','pitchProx2','priority2','continuousBass2','priority1','continuousBass1','pitchProx1','alternateVsMountain2','AlternateVsMountain3','pitchProximity1','commonFate2','loRepHiContEndMissing','repVsPitchHiLo']
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

  var yCoord = 13;

  for (const note of notes) {
    // declare the subarray
    const row = [];
    // each subarray contains multiple objects that have an assigned note
    // and a boolean to flag whether they are "activated"
    // each element in the subarray corresponds to one eigth note

    var xCoord = 19;

    for (let i = 0; i < 8; i++) {
      row.push({
        note: note,
        isActive: false,
        isSelected: false,
        canvasX: xCoord, 
        canvasY: yCoord
      });

      xCoord += 37.5;
    }
    rows.push(row);

    yCoord += 25;
  }

  // we now have 6 rows each containing 16 eighth notes
  return rows;
};


// declaring the notes for each row
// 349.23, 311.13, 261.63, 233.08, 207.65, 174.61 based on https://www.omnicalculator.com/other/note-frequency
const notes = ["F4", "Eb4", "C4", "Bb3", "Ab3", "F3"];
let grid = makeGrid(notes);

// notes which are active in each column
// each note is represented by its row e.g. the note at 4,5 in "grid" will be represented by an integer = 4 in activeNotes[5]
let activeNotes = [[],[],[],[],[],[],[],[]];

// list of lists containing each possible connection of the currently active notes
// e.g. if 0,0 and 1,1 are both active, ["0,0","1,1"] will be in 
let noteConnections = [];

const synths = makeSynths(6);
// loudness (measured in LUFS) seems to be very similar with same volume values
for (let i = 0; i < 6; i++) {
  synths[i].volume.value = 1;
}

let beat = 0;
let playing = false;
let started = false;

const oscTypes = ['sine', 'square', 'triangle', 'sawtooth']

const configLoop = () => {

  let noteElements = [];

  const repeat = (time) => {

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

function writePattern(p) {

  var data = {
    id: document.getElementById('patternId').value,
    zero: p[0],
    one: p[1],
    two: p[2],
    three: p[3],
    four: p[4],
    five: p[5],
    six: p[6],
    seven: p[7]
  };

  $.post("getPattern.php", data);
}

function prepareNewPattern(p) {
    // set each active note class for audio
    grid.forEach((row, rowIndex) => {
      row.forEach((note, noteIndex) => {
        if (p.pattern[noteIndex].includes(rowIndex)) {
          note.isActive = true;
        }
        else {
          note.isActive = false;
        }
      });
    });
  
    // set each active note class for display
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

async function fetchTrialData(fileNames) {
  const allTrials = [];

  for (const fileName of fileNames) {
      const response = await fetch(`./trialData/${fileName}`);

      if (response.ok) {
        const jsonData = await response.json();
        allTrials.push([fileName, jsonData]);
      } else {
        console.error(`Failed to fetch ${fileName}: ${response.status}`);
      }
  }

  return allTrials;
}

function snapDrawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.closePath();
  }

  function snapDrawEndLine(x1, y1, x2, y2) {
    let yMidPoint = (y1+y2)/2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(458, yMidPoint);
    ctx.stroke();
    ctx.closePath();
  
    ctx.beginPath();
    ctx.moveTo(0, yMidPoint);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.closePath();
  }

var patternIdSelect = document.getElementById('patternId');
var userIdSelect = document.getElementById('userId');

patternIdSelect.addEventListener("keypress", function(e) {
  if (e.key == "Enter") {
    document.getElementById("show-button").click();
  }
})

userIdSelect.addEventListener("keypress", function(e) {
  if (e.key == "Enter") {
    document.getElementById("show-button").click();
  }
})

const configShowButton = () => {
    const sButton = document.getElementById("show-button");
    sButton.addEventListener("click", (e) => {
        ctx.clearRect(0, 0, 458.667, 344);
        let myPattern = patternIdSelect.value;
        let myUser = userIdSelect.value;
        let patternExists = false;
        let userExists = false;

        // iterate through each file to find correct user id
        // for (let i in allTrials) {
        //     if (allTrials[i][0].userId == myUser) {
        //         userExists = true;
        //         let userTrials = allTrials[i];
        //         for (let j in userTrials) {
        //             if (userTrials[j].patternId == myPattern) {
        //                 let myTrial = userTrials[j].noteConnections;
        //                 for (let k in myTrial) {
        //                     ctx.fillStyle = myTrial[k].color;
        //                     ctx.strokeStyle = myTrial[k].color;
        //                     if (myTrial[k].startNote[1] > myTrial[k].endNote[1]) {
        //                         snapDrawEndLine(28 + 57.5 *myTrial[k].startNote[1], 28 + 57.5 *myTrial[k].startNote[0],28 + 57.5 *myTrial[k].endNote[1],28 + 57.5 *myTrial[k].endNote[0]);
        //                     }
        //                     else {
        //                         snapDrawLine(28 + 57.5 *myTrial[k].startNote[1], 28 + 57.5 *myTrial[k].startNote[0],28 + 57.5 *myTrial[k].endNote[1],28 + 57.5 *myTrial[k].endNote[0]);
        //                     }
        //                 }
        //                 break;
        //             }
        //         }
        //         break;
        //     }
        // }

        for (let i in allTrials) {
          if (allTrials[i][0] == myUser) {
            userExists = true;
            let userTrials = allTrials[i][1];
            for (let j in userTrials) {
              if (userTrials[j].patternId == myPattern) {
                let myTrial = userTrials[j].noteConnections;
                for (let k in myTrial) {
                  ctx.fillStyle = myTrial[k].color;
                  ctx.strokeStyle = myTrial[k].color;
                  if (myTrial[k].startNote[1] > myTrial[k].endNote[1]) {
                    snapDrawEndLine(28 + 57.5 *myTrial[k].startNote[1], 28 + 57.5 *myTrial[k].startNote[0],28 + 57.5 *myTrial[k].endNote[1],28 + 57.5 *myTrial[k].endNote[0]);
                  }
                  else {
                    snapDrawLine(28 + 57.5 *myTrial[k].startNote[1], 28 + 57.5 *myTrial[k].startNote[0],28 + 57.5 *myTrial[k].endNote[1],28 + 57.5 *myTrial[k].endNote[0]);
                  }
                }
                break;
              }
            }
            break;
          }
        }



        // iterate through all patterns to find correct one to display
        for (let i in allPatterns) {
            if (allPatterns[i].id == myPattern) {
                patternExists = true;
                prepareNewPattern(allPatterns[i]);
                break;
            }
        }

        let errorMessageElement = document.getElementById('errorMessage');
        if (patternExists && userExists) {
            errorMessageElement.style.display = 'none';
        } else {
            errorMessageElement.textContent = 'Invalid pattern/user ID combination. Please try again.';
            errorMessageElement.style.display = 'block';
        }

        Tone.Transport.stop();
        playing = false;
    });
};

function populateDropdowns() {
  const subjectIdSelect = document.getElementById('userId');
  const patternIdSelect = document.getElementById('patternId');

  trialDataFiles.sort();

  for(let i = 0; i < trialDataFiles.length; i++) {
    let opt = document.createElement('option');
    opt.value = trialDataFiles[i];
    opt.innerHTML = trialDataFiles[i];
    subjectIdSelect.appendChild(opt);
  }

  for(let i = 0; i < trialNames.length; i++) {
    let opt = document.createElement('option');
    opt.value = trialNames[i];
    opt.innerHTML = trialNames[i];
    patternIdSelect.appendChild(opt);
  }
}

var canvas = document.getElementById("c");
var ctx = canvas.getContext("2d");
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
ctx.fillStyle = "red";
ctx.lineWidth = 2;
ctx.strokeStyle = "red";

async function initialize() {
    configPlayButton();
    configShowButton();
    makeMarkerSpace();
    makeSequencer();
    populateDropdowns();
  
    allTrials = await fetchTrialData(trialDataFiles);
  }
  
  window.addEventListener("DOMContentLoaded", () => {
    initialize();
  });