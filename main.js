import './style.scss'

import {context, OUTPUT} from './components/Context.js'
import {voice} from './components/audio/voice.js'
import {createSource} from './components/Source.js'
import Lowpass from './components/Lowpass.js'
import Highpass from './components/Highpass.js'
import Bandpass from './components/Bandpass.js'
import Lowshelf from './components/Lowshelf.js'
import Highshelf from './components/Highshelf.js'
import Dynamics from './components/Dynamics.js'
import Waveshaper from './components/Waveshaper.js'
import Gain from './components/Gain.js'
let isPlaying = false;
let currentFilter = null;

const startButton = document.getElementById('startButton');
const filterType = document.getElementById('filterSelector');
const res = document.getElementById('res');
const cut = document.getElementById('cutoff');
const warmth = document.getElementById('warmth');
const type = document.getElementById('filterType');
const canvas = document.getElementById("canvas");

const ctx = canvas.getContext("2d");

const sourceGain = Gain(8);
const dryGain = Gain(8);
const wetGain = Gain(8);
const filterGroupInput = Gain(10);
const filterGroupOutput = Gain(10);
const outputGain = Gain(10);
const color = Waveshaper(10);
const lowPass = Lowpass(valueconv(cut.value), 1);
const highPass = Highpass(valueconv(cut.value), 1);

const bandPass = Bandpass(valueconv(cut.value), 1);
const lowShelf = Lowshelf(valueconv(cut.value), 1);
const highShelf = Highshelf(valueconv(cut.value), 1);
const dynamics = Dynamics();
const filterArray = [lowPass, lowShelf, bandPass, highPass, highShelf];
color.drive.value = 0.5;
color.output.gain.value = 0.5;
highPass.input.gain.value = 0
bandPass.input.gain.value = 0
lowShelf.input.gain.value = 0
highShelf.input.gain.value = 0
lowPass.input.gain.value = 0

//DRAWING THE CURVE
let freqBars = 5000;
let freqArray = new Float32Array(freqBars);
let magOutput = new Float32Array(freqBars); // magnitude
let phaseOutput = new Float32Array(freqBars);

for(let i = 0; i < freqBars; ++i) {
  freqArray[i] = 20000/freqBars*(i+1);
}

function drawFrequencyResponse(mag, phase) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let barWidth = canvas.width / freqBars;
  // Magnitude
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for(let step = 0; step < freqBars; ++step) {
    ctx.lineTo(
      step * barWidth,
      canvas.height - mag[step]*90);
  }
  ctx.stroke();
  // Phase
  ctx.strokeStyle = "red";
  ctx.beginPath();
  for(let step = 0; step < freqBars; ++step) {
    ctx.lineTo(
      step * barWidth,
      canvas.height - (phase[step]*90+300)/Math.PI);
  }
  // ctx.stroke();
}

function updateFrequencyResponse(type, amt) {
  type.filter.getFrequencyResponse(freqArray, magOutput, phaseOutput);
  drawFrequencyResponse(magOutput, phaseOutput);
}

sourceGain.to(wetGain);
wetGain.to(color);
color.to(filterGroupInput);

filterGroupInput.to(lowPass);
filterGroupInput.to(highPass);
filterGroupInput.to(lowShelf);
filterGroupInput.to(highShelf);
filterGroupInput.to(bandPass);
lowPass.to(filterGroupOutput);
highPass.to(filterGroupOutput);
lowShelf.to(filterGroupOutput);
highShelf.to(filterGroupOutput);
bandPass.to(filterGroupOutput);
//
filterGroupOutput.to(dynamics);
dynamics.to(outputGain);

outputGain.to(OUTPUT);

currentFilter = lowPass;
updateFrequencyResponse(lowPass);

function init() {
  const source = createSource(voice);
  const sourceBuffer = source.audioSource;
  source.to(sourceGain);
  sourceBuffer.start();
  isPlaying = true;
  currentFilter.input.gain.value = 1


  const stopButton = document.getElementById('stopButton');
  stopButton.onclick = function() {
    sourceBuffer.stop();
    isPlaying = false;
  };
}

function valueconv(x){
    x = 20 * Math.pow( 1000, x / 100 );
    return x.toFixed(2);
    // if(x <= 1000) return x.toFixed(2) + " Hz";
    // return (x/1000).toFixed(2) + " kHz";
    }

function setNewType(newType) {
  currentFilter = newType;
  updateFrequencyResponse(newType);
}

function dubCrossfade(a, b, value) {
  let gain1 = Math.cos(value * 0.5*Math.PI);
  let gain2 = Math.cos((1.0-value) * 0.5*Math.PI);
  a.setValueAtTime(gain1, context.currentTime);
  b.setValueAtTime(gain2, context.currentTime);
}

function crossfade(a, b, value) {
  var gain1 = Math.cos(value * 0.5*Math.PI);
  var gain2 = Math.cos((1.0-value) * 0.5*Math.PI);
  a.gain.value = gain1;
  b.gain.value = gain2;
}

filterType.addEventListener('change', (e) => {
  currentFilter.input.gain.value = 0;
  let fType = filterArray[e.target.value];
  console.log(e.target.value);
  console.log(currentFilter.input.gain.value);
  console.log(currentFilter.filter.type);
  fType.input.gain.value = 1;
  setNewType(fType);
  // lowPass.resonance(res.value);
});

res.addEventListener('input', () => {
  currentFilter.resonance(res.value);
  updateFrequencyResponse(currentFilter);
});

cut.addEventListener('input', () => {
  let n = valueconv(cut.value);
  currentFilter.cutoff(n);
  updateFrequencyResponse(currentFilter);
});

warmth.addEventListener('input', () => {
  dubCrossfade(color.output.gain, color.drive,  warmth.value);
})

if (isPlaying) {
  startButton.disabled = true;
} else {
  startButton.disabled = false;
}

startButton.addEventListener('click', () => {
  if (isPlaying) { return } else { init() };
});
