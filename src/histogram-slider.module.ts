import register from 'angularjs-register';
import HistogramSliderComponent from './histogram-slider.component';

export default register('histogram-slider')
    .component(HistogramSliderComponent.componentName, HistogramSliderComponent)
    .name();
