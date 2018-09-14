import register from 'angularjs-register';
import HistogramSliderComponent from './histogram-slider.component';
import HistogramSliderModelComponent from './histogram-slider-model.component';

export default register('histogram-slider')
    .component(HistogramSliderComponent.componentName, HistogramSliderComponent)
    .component(HistogramSliderModelComponent.componentName, HistogramSliderModelComponent)
    .name();
