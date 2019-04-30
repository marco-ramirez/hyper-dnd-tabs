const stopPropagation = e => e.stopPropagation();

const START_DRAG_TAB = 'DND_TABS/START_DRAG_TAB';
const STOP_DRAG_TAB = 'DND_TABS/STOP_DRAG_TAB';
const MOVE_TAB = 'DND_TABS/MOVE_TAB';

const moveTab = (from, to) => ({type: MOVE_TAB, from, to});

exports.decorateTab = (Tab, {React, React: {Component}}) => {
    const {tabContainer, tabContainerDragging, tabHandle, dropZone, dropZoneHover} = require('./dnd-tabs.css');

    const Handle = require('../assets/handle')(React);
    const TabHandle = () =>
        <div className={tabHandle} onMouseDown={stopPropagation}>
            <Handle/>
        </div>;

    class DropZone extends Component {
        state = {hover: false}

        onDragEnter = (event) => {
            event.dataTransfer.dropEffect = 'move';
            this.setState({hover: true});
        }

        onDragLeave = () => {
            this.setState({hover: false});
        }

        onDragOver = (event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
        }

        render() {
            const className = `${dropZone} ${this.state.hover ? dropZoneHover : ''}`;
            return <div className={className} onDragOver={this.onDragOver} onDrop={this.props.onDrop}
                onDragEnter={this.onDragEnter} onDragLeave={this.onDragLeave}/>;
        }
    }

    return class DndTab extends Component {
        onDragStart = (event) => {
            event.dataTransfer.dropEffect = 'move';
            this.props.startDragTab(this.getIndex());
        }

        onDragEnd = () => {
            this.props.stopDragTab();
        }

        onDrop = () => {
            this.props.dropTab(this.props.dragging, this.getIndex());
        }

        getIndex() {
            return this.props.tabs.findIndex(({uid}) => this.props.uid === uid);
        }

        render() {
            const {dragging} = this.props;
            const index = this.getIndex();
            const className = `${tabContainer} ${dragging === index ? tabContainerDragging : ''}`;
            return <div draggable className={className} onDragStart={this.onDragStart} onDragEnd={this.onDragEnd}>
                <Tab {...this.props}/>
                <TabHandle/>
                {dragging !== null && dragging !== index && <DropZone onDrop={this.onDrop}/>}
            </div>;
        }
    };
};

exports.reduceUI = (state, action) => {
    switch (action.type) {
        case START_DRAG_TAB:
            return state.setIn(['dndTabs', 'dragging'], action.index);
        case STOP_DRAG_TAB:
            return state.setIn(['dndTabs', 'dragging'], null);
        default:
            return state;
    }
};

const partition = (items, predicate) => items.reduce(
    ([left, right], item) => predicate(item) ? [[...left, item], right] : [left, [...right, item]],
    [[], []]
);

const reorderGroups = (groups, from, to) => {
    const [tabs, nonTabs] = partition(Object.entries(groups), ([, {parentUid}]) => parentUid === null);
    tabs.splice(to, 0, tabs.splice(from, 1)[0]);
    const ordered = [...tabs, ...nonTabs].reduce((obj, [key, value]) => ({...obj, [key]: value}), {});
    return groups.replace({}).replace(ordered);
};

exports.reduceTermGroups = (state, action) => {
    switch (action.type) {
        case MOVE_TAB:
            return state.set('termGroups', reorderGroups(state.termGroups, action.from, action.to));
        default:
            return state;
    }
};

exports.mapHeaderState = (state, props) => ({
    ...props,
    dragging: state.ui.getIn(['dndTabs', 'dragging'], null)
});

exports.mapHeaderDispatch = (dispatch, props) => ({
    ...props,
    startDragTab: index => dispatch({type: START_DRAG_TAB, index}),
    stopDragTab: () => dispatch({type: STOP_DRAG_TAB}),
    dropTab: (from, to) => dispatch(moveTab(from, to))
});

exports.getTabsProps = ({tabs, dragging, startDragTab, stopDragTab, dropTab}, props) =>
    ({tabs, dragging, startDragTab, stopDragTab, dropTab, ...props});

exports.getTabProps = ({uid}, {tabs, dragging, startDragTab, stopDragTab, dropTab}, props) =>
    ({uid, tabs, dragging, startDragTab, stopDragTab, dropTab, ...props});

const moveTabsKeymaps = {
    'tab:moveLeft': 'command+shift+left',
    'tab:moveRight': 'command+shift+right'
};

exports.decorateKeymaps = keymaps => {
    const moveTabsHotKeys = Object.values(moveTabsKeymaps);
    const filteredKeymaps = Object.entries(keymaps).reduce((map, [command, hotkeys]) => {
        if (typeof hotkeys === 'string') {
            if (moveTabsHotKeys.includes(hotkeys)) {
                return map;
            }
            return {...map, [command]: hotkeys};
        }
        return {...map, [command]: hotkeys.filter(keys => !moveTabsHotKeys.includes(keys))};
    }, {});
    return {
        'tab:moveLeft': 'command+shift+left',
        'tab:moveRight': 'command+shift+right',
        ...filteredKeymaps
    };
};

const LEFT = 'LEFT';
const RIGHT = 'RIGHT';

exports.mapTermsState = (state, props) => ({
    ...props,
    tabs: Object.values(state.termGroups.termGroups).filter(({parentUid}) => parentUid === null)
});

exports.mapTermsDispatch = (dispatch, props) => ({
    ...props,
    moveTab: (from, to) => dispatch(moveTab(from, to))
});

exports.decorateTerms = (Terms, {React}) => class DnDTerms extends React.Component {
    moveTab(direction) {
        const from = this.props.tabs.findIndex(({uid}) => uid === this.props.activeRootGroup);
        const to = Math.max(0, Math.min(this.props.tabs.length - 1, from + (direction === LEFT ? -1 : 1)));
        if (from !== to) {
            this.props.moveTab(from, to);
        }
    }

    onDecorated = (terms) => {
        terms.registerCommands({
            'tab:moveLeft': () => {
                this.moveTab(LEFT);
            },
            'tab:moveRight': () => {
                this.moveTab(RIGHT);
            }
        });
        if (this.props.onDecorated) {
            this.props.onDecorated(terms);
        }
    }

    render() {
        return <Terms {...this.props} onDecorated={this.onDecorated}/>;
    }
};
