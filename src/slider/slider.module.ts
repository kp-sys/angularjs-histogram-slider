import register from '@kpsys/angularjs-register';
import 'ngtouchstart';
import SliderComponent from './slider.component';
import SliderModelComponent from './slider-model.component';

export default register('td.slider', ['ngTouchstart'])
    .component(SliderComponent.componentName, SliderComponent)
    .component(SliderModelComponent.componentName, SliderModelComponent)
    .name();
