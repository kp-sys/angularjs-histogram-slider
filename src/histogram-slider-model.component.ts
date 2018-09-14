import HistogramSliderComponent, {HistogramSliderComponentController} from './histogram-slider.component';
import {INgModelController, IPostLink} from 'angular';

export class HistogramSliderModelComponentController implements IPostLink {
    public ngModelController: INgModelController;

    private histogramSliderController: HistogramSliderComponentController;
    private handlerIndex: number;

    public $postLink() {
        this.handlerIndex = this.histogramSliderController.addHandler(this);

        this.ngModelController.$render = () => {
            this.histogramSliderController.updateNewValue(this.handlerIndex, this.ngModelController.$modelValue);
        };
    }
}

/**
 * @ngdoc component
 * @name histogramSliderModel
 * @module histogram-slider
 *
 * @requires {ngModel}
 * @requires {^histogramSlider}
 */
// tslint:disable-next-line
export default class HistogramSliderModelComponent {
    public static componentName = 'histogramSliderModel';

    public require = {
        ngModelController: 'ngModel',
        histogramSliderController: `^${HistogramSliderComponent.componentName}`
    };

    public controller = HistogramSliderModelComponentController;
}
