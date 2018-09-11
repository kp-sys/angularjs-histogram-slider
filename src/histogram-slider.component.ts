import './histogram-slider.less';
import {
    IAttributes,
    IAugmentedJQuery,
    IComponentController,
    IDocumentService,
    INgModelController,
    IPostLink,
    IScope
} from 'angular';
import {HORIZONTAL, PERCENT_EMPTY, PERCENT_FULL, VERTICAL} from './histogram-slider.constants';
import LinearAlgorithm from './algorithms/linear';

function getHandleFor(event: MouseEvent) {
    return Number((event.currentTarget as Element).getAttribute('data-handle-key'));
}

function destroyEvent(event: Event) {
    event.stopPropagation();
    event.preventDefault();
}

interface Rect {
    height: number;
    width: number;
    left: number;
    right: number;
    top: number;
}

export interface SliderAlgorithm {
    /**
     * Return percentage position os anchor
     * @param value Real value
     * @param min
     * @param max
     */
    getPosition(value: number, min: number, max: number): number;

    /**
     * Return real value from position
     * @param pos Percentage position of anchor
     * @param min
     * @param max
     */
    getValue(pos: number, min: number, max: number): number;
}

abstract class HistogramSliderComponentController implements IComponentController, IPostLink {
    public min: number;
    public max: number;
    public values: number[];
    public orientation: string;
    public algorithm: SliderAlgorithm;
    public snap: boolean;
    public snapPoints: number[];

    private ngModelController: INgModelController;
    private document: HTMLDocument;
    private sliderContainer: JQLite;
    private handleNode: Element;
    private handleDimensions: number;
    private handlePositions: number[];
    private slidingIndex: number;

    /*@ngInject*/
    constructor($document: IDocumentService, private $attrs: IAttributes, private $scope: IScope, private $log) {
        this.document = $document[0];
    }

    public set setHandleNode(value: IAugmentedJQuery) {
        this.handleNode = value[0];
    }

    public $postLink(): void {

        this.min = this.min || 0;
        this.max = this.max || 100;
        this.values = this.values || [10, 90];

        this.orientation = this.orientation || HORIZONTAL;
        this.algorithm = this.algorithm || new LinearAlgorithm();

        this.handlePositions = this.values.map((value) => this.algorithm.getPosition(value, this.min, this.max));
        this.handleDimensions = 0;
        this.slidingIndex = null;
    }

    public abstract onSliderDragStart();

    public abstract onSliderDragMove();

    public abstract onSliderDragEnd();

    public abstract onValuesUpdated(values: number[]);

    public abstract getNextHandlePosition(handleIndex: number, percentPosition: number): number;

    /* -------------------------- */

    public startMouseSlide($event: MouseEvent) {
        this.setStartSlide($event);

        this.document.addEventListener('mousemove', this.handleMouseSlide.bind(this), false);
        this.document.addEventListener('mouseup', this.endSlide.bind(this), false);

        if (this.onSliderDragStart) {
            this.onSliderDragStart();
        }

        destroyEvent($event);
    }

    private setStartSlide(event: MouseEvent) {
        // const sliderBox = this.getSliderBoundingBox();

        this.handleDimensions = this.getHandleDimensions();
        this.slidingIndex = getHandleFor(event);

        this.$log.log(this.slidingIndex);
    }

    private handleMouseSlide(event: MouseEvent) {
        if (this.slidingIndex === null) {
            return;
        }

        this.handleSlide(event.clientX, event.clientY);
        destroyEvent(event);
    }

    private handleTouchSlide(event: TouchEvent) {
        if (this.slidingIndex === null) {
            return;
        }

        if (event.changedTouches.length > 1) {
            this.endSlide();
            return;
        }

        const touch = event.changedTouches[0];

        this.handleSlide(touch.clientX, touch.clientY);
        destroyEvent(event);
    }

    private handleSlide(x: number, y: number) {
        const sliderBox = this.getSliderBoundingBox();
        const positionPercent = this.positionPercent(x, y, sliderBox);

        this.slideTo(this.slidingIndex, positionPercent);

        if (this.canMove(this.slidingIndex, positionPercent)) {
            if (this.onSliderDragMove) {
                this.onSliderDragMove();
            }
        }
    }

    private slideTo(idx: number, proposedPosition: number, onAfterSet?: () => any) {
        const actualPosition = this.validatePosition(idx, proposedPosition);

        this.handlePositions = this.handlePositions.map((pos, index) => (
            index === idx ? actualPosition : pos
        ));

        this.values = this.handlePositions.map((pos) => this.algorithm.getValue(pos, this.min, this.max));

        this.$scope.$applyAsync();

        if (this.onValuesUpdated) {
            this.onValuesUpdated(this.values.slice());
        }

        if (onAfterSet) {
            onAfterSet();
        }
    }

    private endSlide() {
        this.slidingIndex = null;

        document.removeEventListener('mouseup', this.endSlide, false);
        document.removeEventListener('touchend', this.endSlide, false);
        document.removeEventListener('touchmove', this.handleTouchSlide, false);
        document.removeEventListener('mousemove', this.handleMouseSlide, false);

        if (this.onSliderDragEnd) {
            this.onSliderDragEnd();
        }
        if (this.snap) {
            const positionPercent = this.getSnapPosition(this.handlePositions[this.slidingIndex]);
            this.slideTo(this.slidingIndex, positionPercent, () => this.setModelValue());
        } else {
            this.setModelValue();
        }
    }

    private getSliderBoundingBox(): Rect {
        const rect = this.sliderContainer[0].getBoundingClientRect();
        return {
            height: rect.height || this.sliderContainer[0].clientHeight,
            width: rect.width || this.sliderContainer[0].clientWidth,
            left: rect.left,
            right: rect.right,
            top: rect.top
        };
    }

    private getSnapPosition(positionPercent: number): number {
        if (!this.snap) {
            return positionPercent;
        }

        const value = this.algorithm.getValue(positionPercent, this.min, this.max);
        const snapValue = this.getClosestSnapPoint(value);
        return this.algorithm.getPosition(snapValue, this.min, this.max);
    }

    private getClosestSnapPoint(value) {
        if (!this.snapPoints.length) {
            return value;
        }

        return this.snapPoints.reduce((snapTo, snap) => (
            Math.abs(snapTo - value) < Math.abs(snap - value) ? snapTo : snap
        ));
    }

    private positionPercent(x: number, y: number, sliderBox: Rect): number {
        if (this.orientation === VERTICAL) {
            return ((y - sliderBox.top) / sliderBox.height) * PERCENT_FULL;
        }
        return ((x - sliderBox.left) / sliderBox.width) * PERCENT_FULL;
    }

    // Can we move the slider to the given position?
    private canMove(idx: number, proposedPosition: number): boolean {
        const sliderBox = this.getSliderBoundingBox();

        const handlePercentage = this.orientation === VERTICAL
            ? ((this.handleDimensions / sliderBox.height) * PERCENT_FULL) / 2
            : ((this.handleDimensions / sliderBox.width) * PERCENT_FULL) / 2;

        if (proposedPosition < PERCENT_EMPTY) {
            return false;
        }
        if (proposedPosition > PERCENT_FULL) {
            return false;
        }

        const nextHandlePosition = this.handlePositions[idx + 1] !== undefined
            ? this.handlePositions[idx + 1] - handlePercentage
            : Infinity;

        if (proposedPosition > nextHandlePosition) {
            return false;
        }

        const prevHandlePosition = this.handlePositions[idx - 1] !== undefined
            ? this.handlePositions[idx - 1] + handlePercentage
            : -Infinity;

        return proposedPosition >= prevHandlePosition;
    }

    private getHandleDimensions() {
        if (!this.handleNode) {
            return 0;
        }

        return this.orientation === VERTICAL
            ? this.handleNode.clientHeight
            : this.handleNode.clientWidth;
    }

    // Make sure the proposed position respects the bounds and
    // does not collide with other handles too much.

    private validatePosition(idx: number, proposedPosition: number): number {
        const nextPosition = this.userAdjustPosition(idx, proposedPosition);
        const sliderBox = this.getSliderBoundingBox();

        const handlePercentage = this.orientation === VERTICAL
            ? ((this.handleDimensions / sliderBox.height) * PERCENT_FULL) / 2
            : ((this.handleDimensions / sliderBox.width) * PERCENT_FULL) / 2;

        return Math.max(
            Math.min(
                nextPosition,
                this.handlePositions[idx + 1] !== undefined
                    ? this.handlePositions[idx + 1] - handlePercentage
                    : PERCENT_FULL, // 100% is the highest value
            ),
            this.handlePositions[idx - 1] !== undefined
                ? this.handlePositions[idx - 1] + handlePercentage
                : PERCENT_EMPTY, // 0% is the lowest value
        );
    }

    // Apply user adjustments to position
    private userAdjustPosition(idx: number, proposedPosition: number): number {

        let nextPosition = proposedPosition;
        if (this.getNextHandlePosition) {
            nextPosition = this.getNextHandlePosition(idx, proposedPosition);

            if (
                isNaN(nextPosition)
                || nextPosition < PERCENT_EMPTY
                || nextPosition > PERCENT_FULL
            ) {
                throw new TypeError('getNextHandlePosition returned invalid position. Valid positions are floats between 0 and 100');
            }
        }

        return nextPosition;
    }

    private setModelValue() {
        if (this.$attrs.ngChange) {
            this.$scope.$eval(this.$attrs.ngChange);
        }

        this.ngModelController.$setViewValue(this.values);
    }
}

/**
 * @ngdoc component
 * @name histogramSlider
 * @module histogramSlider
 *
 * @requires {ngModelController}
 *
 * @param {number=} min Slider minimum value.
 * @param {number=} max Slider maximum value.
 * @param {string=} orientation Possible values are 'HORIZONTAL' or 'VERTICAL'.
 * @param {SliderAlgorithm=} algorithm The algorithm, by default linear, the slider will use. Feel free to write your own as long as it conforms to the shape.
 * @param {boolean=} snap Controls the slider's snapping behavior.
 * @param {number[]=} snapPoints An array of values on the slider where the slider should snap to.
 *
 * @param {function()=} onSliderDragStart
 * @param {function()=} onSliderDragMove
 * @param {function()=} onSliderDragEnd
 * @param {function(values: number[])=} onValuesUpdated
 * @param {function()=} onAfterSet
 * @param {function(handleIndex: number, percentPosition: number)=} getNextHandlePosition If you need to perform custom logic to postprocess the handle position, getNextHandlePosition accepts a callback of the form `(handleIdx: number, percentPosition: number) => number`.
 *                                                                                          Return the updated handle position. This is useful if you need to customize ranges within a single slider.
 */
// tslint:disable-next-line
export default class HistogramSliderComponent {
    public static componentName = 'histogramSlider';

    public templateUrl = require('./histogram-slider.tpl.pug');
    public controller = HistogramSliderComponentController;

    public require = {
        ngModelController: 'ngModel'
    };

    public bindings = {
        min: '@?',
        max: '@?',
        orientation: '@?',
        algorithm: '<?',
        snap: '@?',
        snapPoints: '@?',

        onSliderDragStart: '&?',
        onSliderDragMove: '&?',
        onSliderDragEnd: '&?',
        onValuesUpdated: '&?',
        onAfterSet: '&?',
        getNextHandlePosition: '&?'
    };
}
