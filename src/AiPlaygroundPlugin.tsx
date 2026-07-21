import React from 'react';
import * as Flex from '@twilio/flex-ui';
import { FlexPlugin } from '@twilio/flex-plugin';
import { combineReducers } from 'redux';
import { TaskHelper } from '@twilio/flex-ui';
import SyncToReduxService from './utils/sync-to-redux/SyncToReduxService';
import { reducerHook } from './utils/sync-to-redux/state/syncToReduxSlice';
import { initPaste } from './initPaste';
import { initCallSyncTracking } from './initCallSyncTracking';
import RealTimeTranscriptionTab from './components/RealTimeTranscription';
import { AiPlaygroundPanel } from './components/AiPlayground';
import SupervisorCallTracker from './components/Supervisor/SupervisorCallTracker';
import SupervisorOperatorResultsTab from './components/Supervisor/SupervisorOperatorResultsTab';
import AiAnalysisViewer from './components/AiAnalysisViewer';
import { DataPieChartIcon } from '@twilio-paste/icons/esm/DataPieChartIcon';

const PLUGIN_NAME = 'AiPlaygroundPlugin';
const AI_ANALYSIS_VIEW_NAME = 'ai-analysis-viewer';

const AiAnalysisViewerSideLink: React.FC<{ activeView?: string; showLabel?: boolean }> = ({
  activeView,
  showLabel,
}) => (
  <Flex.SideLink
    icon={<DataPieChartIcon decorative={false} title="AI Analysis Viewer" size="sizeIcon20" />}
    iconActive={<DataPieChartIcon decorative={false} title="AI Analysis Viewer" size="sizeIcon20" />}
    showLabel={showLabel}
    isActive={activeView === AI_ANALYSIS_VIEW_NAME}
    onClick={() => Flex.Actions.invokeAction('NavigateToView', { viewName: AI_ANALYSIS_VIEW_NAME })}
  >
    AI Analysis Viewer
  </Flex.SideLink>
);

export default class AiPlaygroundPlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  async init(flex: typeof Flex, manager: Flex.Manager): Promise<void> {
    initPaste(flex);

    // Register Redux reducer
    const reduxNamespace = 'ai-playground';
    const reducers = reducerHook();

    if (manager.store && manager.store.addReducer) {
      manager.store.addReducer(reduxNamespace, combineReducers(reducers));
    } else {
      console.error('[AiPlaygroundPlugin] Unable to register Redux reducer');
    }

    // Initialize SyncToRedux service
    try {
      await SyncToReduxService.initialize(reduxNamespace);
      console.log('[AiPlaygroundPlugin] SyncToRedux service initialized successfully');
    } catch (error) {
      console.error('[AiPlaygroundPlugin] Failed to initialize SyncToRedux service:', error);
    }

    initCallSyncTracking(flex, manager);

    // Register AI Analysis Viewer as a full Flex view
    flex.ViewCollection.Content.add(
      <Flex.View key="ai-analysis-viewer-view" name={AI_ANALYSIS_VIEW_NAME}>
        <AiAnalysisViewer />
      </Flex.View>
    );

    flex.SideNav.Content.add(
      <AiAnalysisViewerSideLink key="ai-analysis-viewer-side-link" />,
      {
        sortOrder: 35,
      }
    );

    // Register supervisor call tracker in TeamsView
    flex.TeamsView.Content.add(
      <SupervisorCallTracker key="supervisor-call-tracker" />,
      {
        sortOrder: -999,
        align: 'start',
      }
    );

    // Register transcription tab for voice calls
    flex.TaskCanvasTabs.Content.add(
      <Flex.Tab
        key="realtime-transcription"
        uniqueName="realtime-transcription"
        label="RealTime Transcription"
      >
        <RealTimeTranscriptionTab />
      </Flex.Tab>,
      {
        sortOrder: 10,
        if: ({ task }: { task: Flex.ITask }) =>
          TaskHelper.isCallTask(task) && !!task.attributes?.call_sid,
      }
    );

    // Register transcription tab for supervisor view
    flex.Supervisor.TaskCanvasTabs.Content.add(
      <Flex.Tab
        key="supervisor-realtime-transcription"
        uniqueName="supervisor-realtime-transcription"
        label="RealTime Transcription"
      >
        <RealTimeTranscriptionTab />
      </Flex.Tab>,
      {
        sortOrder: 10,
        if: ({ task }: { task: Flex.ITask }) =>
          TaskHelper.isCallTask(task) && !!task.attributes?.call_sid,
      }
    );

    // Register operator results tab for supervisor view
    flex.Supervisor.TaskCanvasTabs.Content.add(
      <Flex.Tab
        key="supervisor-operator-results"
        uniqueName="supervisor-operator-results"
        label="Operator Results"
      >
        <SupervisorOperatorResultsTab />
      </Flex.Tab>,
      {
        sortOrder: 20,
        if: ({ task }: { task: Flex.ITask }) =>
          TaskHelper.isCallTask(task) && !!task.attributes?.call_sid,
      }
    );

    // Replace Panel 2 CRM container with AI Playground
    flex.AgentDesktopView.Panel2.Content.replace(
      <AiPlaygroundPanel key="ai-playground-panel" />,
      {
        sortOrder: -1,
        if: () => true, // Always show
      }
    );
  }
}
