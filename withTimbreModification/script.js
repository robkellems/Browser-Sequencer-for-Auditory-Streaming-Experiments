// Old version of the code which allows for timbre selection for each row.
// This went unused in the final experiment, but you could combine this code with the newer version found in "withoutTimbreModification" for your own use.

// Original code for grid sequencer by Garrett Bodley.
// https://jsfiddle.net/GarrettBodley/435jp1fa/

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
        type: "sine",
        partialCount: 1
        //although partialCount is set to 1 here, it seems that the 
        //default is 0 (max number of partials) regardless
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

  for (const note of notes) {
    // declare the subarray
    const row = [];
    // each subarray contains multiple objects that have an assigned note
    // and a boolean to flag whether they are "activated"
    // each element in the subarray corresponds to one eigth note
    for (let i = 0; i < 8; i++) {
      row.push({
        note: note,
        isActive: false,
        isSelected: false
      });
    }
    rows.push(row);
  }

  // we now have 6 rows each containing 16 eighth notes
  return rows;
};


// declaring the notes for each row
// 349.23, 311.13, 261.63, 233.08, 207.65, 174.61 based on https://www.omnicalculator.com/other/note-frequency
const notes = ["F4", "Eb4", "C4", "Bb3", "Ab3", "F3"];
let grid = makeGrid(notes);

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

    //creating dropdown menu for oscillator selection
    const dropdown = document.createElement('select');
    seqRow.appendChild(dropdown);
    for (let i = 0; i < oscTypes.length; i++) {
      let option = document.createElement('option');
      option.value = oscTypes[i];
      option.text = oscTypes[i];
      dropdown.appendChild(option);
    }

    //waiting for user input to change oscillator
    dropdown.addEventListener('change', function(eve) {
      synths[rowIndex].oscillator.type = dropdown.options[dropdown.selectedIndex].text;
    });

    //creating number input for partial number selection
    const partials = document.createElement('select');
    seqRow.appendChild(partials);
    let i = 1;
    while (i < 65) {
      let option = document.createElement('option');
      option.value = i;
      option.text = i;
      partials.appendChild(option);
      i = i * 2
    }

    //waiting for user input to change number of partials
    partials.addEventListener('change', function(p) {
      synths[rowIndex].oscillator.partialCount = partials.options[partials.selectedIndex].value;
    });

    row.forEach((note, noteIndex) => {
      const button = document.createElement("button");
      button.className = "note"
      button.addEventListener("click", function(e) {
        handleNoteClick(rowIndex, noteIndex, e);
      });

      button.addEventListener('contextmenu', function(ev) {
        ev.preventDefault();
        handleNoteRightClick(rowIndex, noteIndex, ev);
        return false;
    }, false);

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

const handleNoteClick = (clickedRowIndex, clickedNoteIndex, e) => {
  grid.forEach((row, rowIndex) => {
    row.forEach((note, noteIndex) => {
      if (clickedRowIndex === rowIndex && clickedNoteIndex === noteIndex) {
        note.isActive = !note.isActive;
        e.target.className = classNames(
          "note", 
          { "note-is-active": !!note.isActive }, 
          { "note-not-active": !note.isActive }
        );
      }
    });
  });
};

const handleNoteRightClick = (clickedRowIndex, clickedNoteIndex, e) => {
  grid.forEach((row, rowIndex) => {
    row.forEach((note, noteIndex) => {
      if (clickedRowIndex === rowIndex && clickedNoteIndex === noteIndex) {
        if (note.isActive) {
          note.isSelected = !note.isSelected
          e.target.className = classNames(
            "note", 
            { "note-is-selected": !!note.isSelected }, 
            { "note-not-selected": !note.isSelected }
          );
        }
      }
    });
  });
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

makeMarkerSpace();

window.addEventListener("DOMContentLoaded", () => {
  configPlayButton();
	makeSequencer();
});
