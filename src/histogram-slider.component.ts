import './histogram-slider.less';
import {IAttributes, IAugmentedJQuery, IComponentController, IDocumentService, IPostLink, IScope} from 'angular';
import {PERCENT_EMPTY, PERCENT_FULL, VERTICAL} from './histogram-slider.constants';
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

interface InternalState {
    handlePos: number[];
    values: number[];
}

interface PublicState {
    min: number;
    max: number;
    values: number[];
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
    public max: number;
    public min: number;
    public orientation: string;
    public algorithm: SliderAlgorithm;

    public values: number[];

    public abstract snap: boolean;
    public abstract snapPoints: number[];

    private document: HTMLDocument;
    private sliderContainer: JQLite;
    private handleNode: Element;

    private state: { [x: string]: any };
    private style: { top: string; position: string } | { left: string; position: string };

    /*@ngInject*/
    constructor($document: IDocumentService, private $attrs: IAttributes, private $scope: IScope, private $log) {
        this.document = $document[0];
    }

    public set setHandleNode(value: IAugmentedJQuery) {
        this.handleNode = value[0];
    }

    public $postLink(): void {

        if (!this.algorithm) {
            this.algorithm = new LinearAlgorithm();
        }

        this.min = this.min || 0;
        this.max = this.max || 100;

        const values = [10, 90];

        this.state = {
            handlePos: values.map((value) => this.algorithm.getPosition(value, this.min, this.max)),
            handleDimensions: 0,
            slidingIndex: null,
            values
        };
    }

    public abstract onSliderDragStart();

    public abstract onSliderDragMove();

    public abstract onSliderDragEnd();

    public abstract onValuesUpdated(state?: PublicState);

    public abstract getNextHandlePosition(handleIndex: number, percentPosition: number): number;

    public startMouseSlide($event: MouseEvent) {
        this.setStartSlide($event);

        this.document.addEventListener('mousemove', this.handleMouseSlide.bind(this), false);
        this.document.addEventListener('mouseup', this.endSlide.bind(this), false);

        if (this.onSliderDragStart) {
            this.onSliderDragStart();
        }

        destroyEvent($event);
    }

    public getPublicState(): PublicState {
        const {values} = this.state;

        return {
            max: this.max,
            min: this.min,
            values,
        };
    }

    private setState(x: any, c?) {
        this.$scope.$applyAsync(() => {
            for (const key in x) {
                if (Object.prototype.hasOwnProperty.call(x, key)) {
                    this.state[key] = x[key];
                    if (c) {
                        c();
                    }
                }
            }
        });
    }

    private setStartSlide(event: MouseEvent) {
        // const sliderBox = this.getSliderBoundingBox();

        this.setState({
            handleDimensions: this.getHandleDimensions(),
            slidingIndex: getHandleFor(event)
        });
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

    private handleMouseSlide(event: MouseEvent) {
        const {slidingIndex} = this.state;

        if (slidingIndex === null) {
            return;
        }

        this.handleSlide(event.clientX, event.clientY);
        destroyEvent(event);
    }

    private endSlide() {
        const {
            slidingIndex,
            handlePos,
        } = this.state;

        this.setState({slidingIndex: null});

        document.removeEventListener('mouseup', this.endSlide, false);
        document.removeEventListener('touchend', this.endSlide, false);
        document.removeEventListener('touchmove', this.handleTouchSlide, false);
        document.removeEventListener('mousemove', this.handleMouseSlide, false);

        if (this.onSliderDragEnd) {
            this.onSliderDragEnd();
        }
        if (this.snap) {
            const positionPercent = this.getSnapPosition(handlePos[slidingIndex]);
            this.slideTo(slidingIndex, positionPercent, () => this.fireChangeEvent());
        } else {
            this.fireChangeEvent();
        }
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

    private handleSlide(x: number, y: number) {
        const {slidingIndex: idx} = this.state;

        const sliderBox = this.getSliderBoundingBox();
        const positionPercent = this.positionPercent(x, y, sliderBox);

        this.slideTo(idx, positionPercent);

        if (this.canMove(idx, positionPercent)) {
            if (this.onSliderDragMove) {
                this.onSliderDragMove();
            }
        }
    }

    private handleTouchSlide(event: TouchEvent) {
        const {slidingIndex} = this.state;

        if (slidingIndex === null) {
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

    private positionPercent(x: number, y: number, sliderBox: Rect): number {
        const {orientation} = this.state;

        if (orientation === VERTICAL) {
            return ((y - sliderBox.top) / sliderBox.height) * PERCENT_FULL;
        }
        return ((x - sliderBox.left) / sliderBox.width) * PERCENT_FULL;
    }

    // Can we move the slider to the given position?
    private canMove(idx: number, proposedPosition: number): boolean {
        const {
            handlePos,
            handleDimensions,
        } = this.state;

        const sliderBox = this.getSliderBoundingBox();

        const handlePercentage = this.orientation === VERTICAL
            ? ((handleDimensions / sliderBox.height) * PERCENT_FULL) / 2
            : ((handleDimensions / sliderBox.width) * PERCENT_FULL) / 2;

        if (proposedPosition < PERCENT_EMPTY) {
            return false;
        }
        if (proposedPosition > PERCENT_FULL) {
            return false;
        }

        const nextHandlePosition = handlePos[idx + 1] !== undefined
            ? handlePos[idx + 1] - handlePercentage
            : Infinity;

        if (proposedPosition > nextHandlePosition) {
            return false;
        }

        const prevHandlePosition = handlePos[idx - 1] !== undefined
            ? handlePos[idx - 1] + handlePercentage
            : -Infinity;

        return proposedPosition >= prevHandlePosition;
    }

    private slideTo(idx: number, proposedPosition: number, onAfterSet?: () => any) {
        const nextState = this.getNextState(idx, proposedPosition);

        this.setState(nextState, () => {
            if (this.onValuesUpdated) {
                this.onValuesUpdated(this.getPublicState());
            }
            if (onAfterSet) {
                onAfterSet();
            }
        });

        this.style = this.orientation === VERTICAL
            ? {top: `${proposedPosition}%`, position: 'absolute'}
            : {left: `${proposedPosition}%`, position: 'absolute'};
    }

    private getNextState(idx: number, proposedPosition: number): InternalState {
        const {handlePos} = this.state;

        const actualPosition = this.validatePosition(idx, proposedPosition);

        const nextHandlePos = handlePos.map((pos, index) => (
            index === idx ? actualPosition : pos
        ));

        return {
            handlePos: nextHandlePos,
            values: nextHandlePos.map((pos) => this.algorithm.getValue(pos, this.min, this.max)),
        };
    }

    private getHandleDimensions() {
        if (!this.handleNode) {
            return 0;
        }

        return this.orientation === VERTICAL
            ? this.handleNode.clientHeight
            : this.handleNode.clientWidth;
    }

    private fireChangeEvent() {
        if (this.$attrs.ngChange) {
            this.$scope.$eval(this.$attrs.ngChange);
        }
    }

    // Make sure the proposed position respects the bounds and

    // does not collide with other handles too much.
    private validatePosition(idx: number, proposedPosition: number): number {
        const {
            handlePos,
            handleDimensions,
        } = this.state;

        const nextPosition = this.userAdjustPosition(idx, proposedPosition);

        const sliderBox = this.getSliderBoundingBox();

        const handlePercentage = this.orientation === VERTICAL
            ? ((handleDimensions / sliderBox.height) * PERCENT_FULL) / 2
            : ((handleDimensions / sliderBox.width) * PERCENT_FULL) / 2;

        return Math.max(
            Math.min(
                nextPosition,
                handlePos[idx + 1] !== undefined
                    ? handlePos[idx + 1] - handlePercentage
                    : PERCENT_FULL, // 100% is the highest value
            ),
            handlePos[idx - 1] !== undefined
                ? handlePos[idx - 1] + handlePercentage
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
}

// tslint:disable-next-line
export default class HistogramSliderComponent {
    public static componentName = 'histogramSlider';

    public templateUrl = require('./histogram-slider.tpl.pug');
    public controller = HistogramSliderComponentController;

    public bindings = {
        orientation: '@',
        max: '@',
        min: '@',
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
