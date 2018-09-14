import register from 'angularjs-register';
import SliderComponent from './slider.component';
import SliderModelComponent from './slider-model.component';

export default register('slider')
    .component(SliderComponent.componentName, SliderComponent)
    .component(SliderModelComponent.componentName, SliderModelComponent)
    .name();
