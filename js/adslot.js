import React from 'react';
import PropTypes from 'prop-types';
import DFPManager from './manager';
import { Context } from './dfpslotsprovider';

let dynamicAdCount = 0;

export class AdSlot extends React.Component {
  static propTypes = {
    dfpNetworkId: PropTypes.string,
    adUnit: PropTypes.string,
    sizes: PropTypes.arrayOf(
      PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.number),
        PropTypes.string,
      ]),
    ),
    renderOutOfThePage: PropTypes.bool,
    sizeMapping: PropTypes.arrayOf(PropTypes.object),
    fetchNow: PropTypes.bool,
    adSenseAttributes: PropTypes.object,
    targetingArguments: PropTypes.object,
    onSlotRender: PropTypes.func,
    onSlotRegister: PropTypes.func,
    onSlotIsViewable: PropTypes.func,
    onSlotVisibilityChanged: PropTypes.func,
    shouldRefresh: PropTypes.func,
    slotId: PropTypes.string,
    className: PropTypes.string,
  };

  static defaultProps = {
    fetchNow: false,
  };

  constructor(props) {
    super(props);
    this.doRegisterSlot = this.doRegisterSlot.bind(this);
    this.generateSlotId = this.generateSlotId.bind(this);
    this.getSlotId = this.getSlotId.bind(this);
    this.mapContextToAdSlotProps = this.mapContextToAdSlotProps.bind(this);
    this.slotShouldRefresh = this.slotShouldRefresh.bind(this);
    this.slotRenderEnded = this.slotRenderEnded.bind(this);
    this.slotRegisterCallback = this.slotRegisterCallback.bind(this);
    this.slotIsViewable = this.slotIsViewable.bind(this);
    this.slotVisibilityChanged = this.slotVisibilityChanged.bind(this);
    this.getClasses = this.getClasses.bind(this);
    this.state = {
      slotId: this.props.slotId || null,
      className: this.props.className || '',
    };
    this.adElementRef = React.createRef ? React.createRef() : (element) => {
      this.adElementRef = element;
    };
  }

  componentDidMount() {
    // register this ad-unit in the <DFPSlotProvider>, when available.
    if (this.context !== undefined && this.context.newSlotCallback) {
      this.context.newSlotCallback();
    }
    this.registerSlot();
  }

  componentWillUnmount() {
    this.unregisterSlot();
  }

  getSlotId() {
    return this.props.slotId || this.state.slotId;
  }

  getClasses() {
    const baseClass = 'adunitContainer';
    const extraClasses = this.state.className.split(' ');
    extraClasses.push(baseClass);
    return extraClasses;
  }

  generateSlotId() {
    return `adSlot-${dynamicAdCount++}`;
  }

  mapContextToAdSlotProps() {
    const context = this.context;
    const mappedProps = {};
    if (context.dfpNetworkId !== undefined) {
      mappedProps.dfpNetworkId = context.dfpNetworkId;
    }
    if (context.dfpAdUnit !== undefined) {
      mappedProps.adUnit = context.dfpAdUnit;
    }
    if (context.dfpSizeMapping !== undefined) {
      mappedProps.sizeMapping = context.dfpSizeMapping;
    }
    if (context.dfpTargetingArguments !== undefined) {
      mappedProps.targetingArguments = context.dfpTargetingArguments;
    }
    return mappedProps;
  }

  doRegisterSlot() {
    DFPManager.registerSlot({
      ...this.mapContextToAdSlotProps(),
      ...this.props,
      ...this.state,
      slotShouldRefresh: this.slotShouldRefresh,
    });
    if (this.props.fetchNow === true) {
      DFPManager.load(this.getSlotId());
    }
    DFPManager.attachSlotRenderEnded(this.slotRenderEnded);
    DFPManager.attachSlotIsViewable(this.slotIsViewable);
    DFPManager.attachSlotVisibilityChanged(this.slotVisibilityChanged);

    this.slotRegisterCallback();
  }

  registerSlot() {
    if (this.state.slotId === null) {
      this.setState({
        slotId: this.generateSlotId(),
      }, this.doRegisterSlot);
    } else {
      this.doRegisterSlot();
    }
  }

  unregisterSlot() {
    DFPManager.unregisterSlot({
      ...this.mapContextToAdSlotProps(),
      ...this.props,
      ...this.state,
    });
    DFPManager.detachSlotRenderEnded(this.slotRenderEnded);
    DFPManager.detachSlotIsViewable(this.slotIsViewable);
    DFPManager.detachSlotVisibilityChanged(this.slotVisibilityChanged);
  }

  slotRenderEnded(eventData) {
    if (eventData.slotId === this.getSlotId()) {
      if (this.props.onSlotRender !== undefined) {
        // now that slot has rendered we have access to the ref
        const params = {
          ...eventData,
          adElementRef: this.adElementRef,
        };
        this.props.onSlotRender(params);
      }
    }
  }

  slotRegisterCallback() {
    if (typeof this.props.onSlotRegister === 'function') {
      this.props.onSlotRegister({
        slotId: this.getSlotId(),
        sizes: this.props.sizes,
        slotCount: dynamicAdCount,
        adElementRef: this.adElementRef,
      });
    }
  }

  slotIsViewable(eventData) {
    if (eventData.slotId === this.getSlotId()) {
      if (this.props.onSlotIsViewable !== undefined) {
        this.props.onSlotIsViewable(eventData);
      }
    }
  }

  slotVisibilityChanged(eventData) {
    if (eventData.slotId === this.getSlotId()) {
      if (this.props.onSlotVisibilityChanged !== undefined) {
        this.props.onSlotVisibilityChanged(eventData);
      }
    }
  }

  slotShouldRefresh() {
    let r = true;
    if (this.props.shouldRefresh !== undefined) {
      r = this.props.shouldRefresh({
        ...this.mapContextToAdSlotProps(),
        ...this.props,
        slotId: this.getSlotId(),
      });
    }
    return r;
  }

  render() {
    const { slotId } = this.state;
    const props = { className: 'adBox' };
    if (slotId !== null) {
      props.id = slotId;
    }

    return (
      <div className={this.getClasses().join(' ').trim()}>
        <div ref={this.adElementRef} {...props} />
      </div>
    );
  }
}

if (Context === null) {
  // React < 16.3
  AdSlot.contextTypes = {
    dfpNetworkId: PropTypes.string,
    dfpAdUnit: PropTypes.string,
    dfpSizeMapping: PropTypes.arrayOf(PropTypes.object),
    dfpTargetingArguments: PropTypes.object,
    newSlotCallback: PropTypes.func,
  };
} else {
  AdSlot.contextType = Context;
}


export default AdSlot;
