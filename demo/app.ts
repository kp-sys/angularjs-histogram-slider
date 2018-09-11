import 'angular';
import register from 'angularjs-register';
// @ts-ignore
import histogramSliderModule from '../dist/histogram-slider';
import '../dist/histogram-slider.css';

register('app', [histogramSliderModule]);
