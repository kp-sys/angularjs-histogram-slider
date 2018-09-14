import 'angular';
import register from 'angularjs-register';
// @ts-ignore
import histogramSliderModule from '../dist/histogram-slider';
import '../dist/histogram-slider.css';

import DemoController from './demo.controller';

register('app', [histogramSliderModule])
    .filter('range', function rangeFilter() {
        return (n) => {
            const res = [];
            for (let i = 0; i < n; i++) {
                res.push(i);
            }
            return res;
        };
    })
    .controller('demoController', DemoController);
