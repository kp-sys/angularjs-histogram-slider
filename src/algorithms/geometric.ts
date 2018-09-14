import {SliderAlgorithm} from '../histogram-slider.component';

export default class GeometricAlgorithm implements SliderAlgorithm {
    public getPosition(x, min, max) {
        return ((max / (max - min)) ** 0.5) * (((x - min) / max) ** 0.5) * 100;
    }

    public getValue(x, min, max) {
        return (Math.round(((x / 100) ** 2) * (max - min)) + min);
    }
}
