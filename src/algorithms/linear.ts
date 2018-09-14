import {SliderAlgorithm} from '../slider.component';

export default class LinearAlgorithm implements SliderAlgorithm {

    public getValue(pos, min, max) {
        const decimal = pos / 100;

        if (pos === 0) {
            return min;
        }

        if (pos === 100) {
            return max;
        }

        return Math.round(((max - min) * decimal) + min);
    }

    public getPosition(value, min, max) {
        return ((value - min) / (max - min)) * 100;
    }
}
