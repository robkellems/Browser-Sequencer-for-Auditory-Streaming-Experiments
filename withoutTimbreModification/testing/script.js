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

//list of each pattern which is presented to user (two example patterns included for testing)
//each list contains notes which are active in each column
//each note is represented by its row e.g. the note at 4,5 in "grid" will be represented by an integer = 4 in activeNotes[5]
let activeNotesList = [[[0],[0],[0],[0],[0],[0],[0],[0]],
                   [[0],[1],[2],[3],[4],[5],[4],[3]]];

//list of lists containing each possible connection of the currently active notes
//e.g. if 0,0 and 1,1 are both active, ["0,0","1,1"] will be in 
let noteConnections = [];

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
      if (activeNotes[noteIndex].includes(rowIndex)) {
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

    //code for collecting user data should go here

    curPattern += 1;
    activeNotes = activeNotesList[curPattern];
    prepareNewPattern();
  });
}

var canvas = document.getElementById("c");
var ctx = canvas.getContext("2d");
ctx.fillStyle = "red";
ctx.strokeStyle = "red";

let curPattern = 0;
let activeNotes = activeNotesList[curPattern];

window.addEventListener("DOMContentLoaded", () => {
  configPlayButton();
  configSubmitButton();
  makeMarkerSpace();
	makeSequencer();
  prepareNewPattern();
});