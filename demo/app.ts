import 'angular';
import register from 'angularjs-register';
// @ts-ignore
import sliderModule from '../dist/slider';
import '../dist/slider.css';

import DemoController from './demo.controller';

register('app', [sliderModule])
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
