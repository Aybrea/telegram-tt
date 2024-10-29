import type { FC } from '../../lib/teact/teact';
import React, {
  memo, useCallback,
  useEffect, useMemo, useRef, useState,
} from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type {
  ApiBotPreviewMedia,
  ApiChat,
  ApiChatMember,
  ApiMessage,
  ApiTypeStory,
  ApiUser,
  ApiUserStatus,
} from '../../api/types';
import type { TabState } from '../../global/types';
import type {
  ISettings, ProfileState, ProfileTabType, SharedMediaType, ThreadId,
} from '../../types';
import { MAIN_THREAD_ID } from '../../api/types';
import { MediaViewerOrigin, NewChatMembersProgress } from '../../types';

import {
  MEMBERS_SLICE,
  PROFILE_SENSITIVE_AREA,
  SHARED_MEDIA_SLICE,
  SLIDE_TRANSITION_DURATION,
} from '../../config';
import {
  getHasAdminRight,
  getIsSavedDialog,
  isChatAdmin,
  isChatChannel,
  isChatGroup,
  isUserBot,
  isUserRightBanned,
} from '../../global/helpers';
import {
  selectActiveDownloads,
  selectChat,
  selectChatFullInfo,
  selectChatMessages,
  selectCurrentSharedMediaSearch,
  selectIsCurrentUserPremium,
  selectIsRightColumnShown,
  selectPeerStories,
  selectSimilarChannelIds,
  selectTabState,
  selectTheme,
  selectUser,
  selectUserCommonChats,
  selectUserFullInfo,
} from '../../global/selectors';
import { selectPremiumLimit } from '../../global/selectors/limits';
import { captureEvents, SwipeDirection } from '../../util/captureEvents';
import { IS_TOUCH_ENV } from '../../util/windowEnvironment';

import usePeerStoriesPolling from '../../hooks/polling/usePeerStoriesPolling';
import useCacheBuster from '../../hooks/useCacheBuster';
import useEffectWithPrevDeps from '../../hooks/useEffectWithPrevDeps';
import useFlag from '../../hooks/useFlag';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import useLastCallback from '../../hooks/useLastCallback';
import useOldLang from '../../hooks/useOldLang';
import useAsyncRendering from './hooks/useAsyncRendering';
import useProfileState from './hooks/useProfileState';
import useProfileViewportIds from './hooks/useProfileViewportIds';
import useTransitionFixes from './hooks/useTransitionFixes';

import ChatExtra from '../common/profile/ChatExtra';
import ProfileInfo from '../common/ProfileInfo';
import InfiniteScroll from '../ui/InfiniteScroll';
import RadioGroup from '../ui/RadioGroup';

import './ScheduledCleaning.scss';

import UserBlockRoundedPath from '../../assets/nIcons/user-block-rounded.svg';

type OwnProps = {
  chatId: string;
  threadId?: ThreadId;
  profileState: ProfileState;
  isMobile?: boolean;
  onProfileStateChange: (state: ProfileState) => void;
};

type StateProps = {
  theme: ISettings['theme'];
  isChannel?: boolean;
  currentUserId?: string;
  messagesById?: Record<number, ApiMessage>;
  foundIds?: number[];
  mediaSearchType?: SharedMediaType;
  hasCommonChatsTab?: boolean;
  hasStoriesTab?: boolean;
  hasMembersTab?: boolean;
  hasPreviewMediaTab?: boolean;
  areMembersHidden?: boolean;
  canAddMembers?: boolean;
  canDeleteMembers?: boolean;
  members?: ApiChatMember[];
  adminMembersById?: Record<string, ApiChatMember>;
  commonChatIds?: string[];
  storyIds?: number[];
  pinnedStoryIds?: number[];
  archiveStoryIds?: number[];
  storyByIds?: Record<number, ApiTypeStory>;
  chatsById: Record<string, ApiChat>;
  usersById: Record<string, ApiUser>;
  userStatusesById: Record<string, ApiUserStatus>;
  isRightColumnShown: boolean;
  isRestricted?: boolean;
  activeDownloads: TabState['activeDownloads'];
  isChatProtected?: boolean;
  nextProfileTab?: ProfileTabType;
  shouldWarnAboutSvg?: boolean;
  similarChannels?: string[];
  botPreviewMedia? : ApiBotPreviewMedia[];
  isCurrentUserPremium?: boolean;
  limitSimilarChannels: number;
  isTopicInfo?: boolean;
  isSavedDialog?: boolean;
  forceScrollProfileTab?: boolean;
  isSynced?: boolean;
};

type TabProps = {
  type: ProfileTabType;
  title: string;
};

const TABS: TabProps[] = [
  { type: 'media', title: 'SharedMediaTab2' },
  { type: 'documents', title: 'SharedFilesTab2' },
  { type: 'links', title: 'SharedLinksTab2' },
  { type: 'audio', title: 'SharedMusicTab2' },
];

const HIDDEN_RENDER_DELAY = 1000;
const INTERSECTION_THROTTLE = 500;

const schedulingOptions = [{
  label: '关闭',
  value: '0',
}, {
  label: '1天',
  value: '1',
}, {
  label: '1周',
  value: '2',
}, {
  label: '1月',
  value: '3',
}, {
  label: '3月',
  value: '4',
}, {
  label: '6月',
  value: '5',
}, {
  label: '自定义时间',
  value: '6',
}];

const ScheduledCleaning: FC<OwnProps & StateProps> = ({
  chatId,
  threadId,
  profileState,
  isChannel,
  currentUserId,
  messagesById,
  foundIds,
  storyIds,
  pinnedStoryIds,
  archiveStoryIds,
  mediaSearchType,
  hasCommonChatsTab,
  hasStoriesTab,
  hasMembersTab,
  hasPreviewMediaTab,
  botPreviewMedia,
  commonChatIds,
  members,
  usersById,
  userStatusesById,
  chatsById,
  isRightColumnShown,
  nextProfileTab,
  similarChannels,
  isTopicInfo,
  isSavedDialog,
  forceScrollProfileTab,
  isSynced,
  onProfileStateChange,
}) => {
  const {
    setSharedMediaSearchType,
    loadMoreMembers,
    loadCommonChats,
    openChat,
    searchSharedMediaMessages,
    openMediaViewer,
    openAudioPlayer,
    focusMessage,
    setNewChatMembersDialogState,
    loadPeerProfileStories,
    loadStoriesArchive,
    openPremiumModal,
    loadChannelRecommendations,
    loadPreviewMedias,
  } = getActions();

  // eslint-disable-next-line no-null/no-null
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-null/no-null
  const transitionRef = useRef<HTMLDivElement>(null);
  const lang = useOldLang();
  const [deletingUserId, setDeletingUserId] = useState<string | undefined>();

  const profileId = isSavedDialog ? String(threadId) : chatId;
  const isSavedMessages = profileId === currentUserId && !isSavedDialog;

  const tabs = useMemo(() => ([
    ...(isSavedMessages && !isSavedDialog ? [{ type: 'dialogs' as const, title: 'SavedDialogsTab' }] : []),
    ...(hasStoriesTab ? [{ type: 'stories' as const, title: 'ProfileStories' }] : []),
    ...(hasStoriesTab && isSavedMessages ? [{ type: 'storiesArchive' as const, title: 'ProfileStoriesArchive' }] : []),
    ...(hasMembersTab ? [{
      type: 'members' as const, title: isChannel ? 'ChannelSubscribers' : 'GroupMembers',
    }] : []),
    ...(hasPreviewMediaTab ? [{
      type: 'previewMedia' as const, title: 'ProfileBotPreviewTab',
    }] : []),
    ...TABS,
    // TODO The filter for voice messages currently does not work
    // in forum topics. Return it when it's fixed on the server side.
    ...(!isTopicInfo ? [{ type: 'voice' as const, title: 'SharedVoiceTab2' }] : []),
    ...(hasCommonChatsTab ? [{ type: 'commonChats' as const, title: 'SharedGroupsTab2' }] : []),
    ...(isChannel && similarChannels?.length
      ? [{ type: 'similarChannels' as const, title: 'SimilarChannelsTab' }]
      : []),
  ]), [
    hasCommonChatsTab,
    hasMembersTab,
    hasPreviewMediaTab,
    hasStoriesTab,
    isChannel,
    isTopicInfo,
    similarChannels,
    isSavedMessages,
    isSavedDialog,
  ]);

  const initialTab = useMemo(() => {
    if (!nextProfileTab) {
      return 0;
    }

    const index = tabs.findIndex(({ type }) => type === nextProfileTab);
    return index === -1 ? 0 : index;
  }, [nextProfileTab, tabs]);

  const [allowAutoScrollToTabs, startAutoScrollToTabsIfNeeded, stopAutoScrollToTabs] = useFlag(false);

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (!nextProfileTab) return;
    const index = tabs.findIndex(({ type }) => type === nextProfileTab);

    if (index === -1) return;
    setActiveTab(index);
  }, [nextProfileTab, tabs]);

  const handleSwitchTab = useCallback((index: number) => {
    startAutoScrollToTabsIfNeeded();
    setActiveTab(index);
  }, []);

  useEffect(() => {
    if (hasPreviewMediaTab && !botPreviewMedia) {
      loadPreviewMedias({ botId: chatId });
    }
  }, [chatId, botPreviewMedia, hasPreviewMediaTab]);

  useEffect(() => {
    if (isChannel && !similarChannels && isSynced) {
      loadChannelRecommendations({ chatId });
    }
  }, [chatId, isChannel, similarChannels, isSynced]);

  const renderingActiveTab = activeTab > tabs.length - 1 ? tabs.length - 1 : activeTab;
  const tabType = tabs[renderingActiveTab].type as ProfileTabType;
  const handleLoadCommonChats = useCallback(() => {
    loadCommonChats({ userId: chatId });
  }, [chatId]);
  const handleLoadPeerStories = useCallback(({ offsetId }: { offsetId: number }) => {
    loadPeerProfileStories({ peerId: chatId, offsetId });
  }, [chatId]);
  const handleLoadStoriesArchive = useCallback(({ offsetId }: { offsetId: number }) => {
    loadStoriesArchive({ peerId: currentUserId!, offsetId });
  }, [currentUserId]);

  const [resultType, viewportIds, getMore, noProfileInfo] = useProfileViewportIds(
    loadMoreMembers,
    handleLoadCommonChats,
    searchSharedMediaMessages,
    handleLoadPeerStories,
    handleLoadStoriesArchive,
    tabType,
    mediaSearchType,
    members,
    commonChatIds,
    usersById,
    userStatusesById,
    chatsById,
    messagesById,
    foundIds,
    threadId,
    storyIds,
    pinnedStoryIds,
    archiveStoryIds,
    similarChannels,
  );
  const isFirstTab = (isSavedMessages && resultType === 'dialogs')
    || (hasStoriesTab && resultType === 'stories')
    || resultType === 'members'
    || (!hasMembersTab && resultType === 'media');
  const activeKey = tabs.findIndex(({ type }) => type === resultType);

  usePeerStoriesPolling(resultType === 'members' ? viewportIds as string[] : undefined);

  const handleStopAutoScrollToTabs = useLastCallback(() => {
    stopAutoScrollToTabs();
  });

  const { handleScroll } = useProfileState(
    containerRef,
    resultType,
    profileState,
    onProfileStateChange,
    forceScrollProfileTab,
    allowAutoScrollToTabs,
    handleStopAutoScrollToTabs,
  );

  const { applyTransitionFix, releaseTransitionFix } = useTransitionFixes(containerRef);

  const [cacheBuster, resetCacheBuster] = useCacheBuster();

  const { observe: observeIntersectionForMedia } = useIntersectionObserver({
    rootRef: containerRef,
    throttleMs: INTERSECTION_THROTTLE,
  });

  const handleTransitionStop = useLastCallback(() => {
    releaseTransitionFix();
    resetCacheBuster();
  });

  const handleNewMemberDialogOpen = useLastCallback(() => {
    setNewChatMembersDialogState({ newChatMembersProgress: NewChatMembersProgress.InProgress });
  });

  // Update search type when switching tabs or forum topics
  useEffect(() => {
    setSharedMediaSearchType({ mediaType: tabType as SharedMediaType });
  }, [setSharedMediaSearchType, tabType, threadId]);

  const handleSelectMedia = useLastCallback((messageId: number) => {
    openMediaViewer({
      chatId: profileId,
      threadId: MAIN_THREAD_ID,
      messageId,
      origin: MediaViewerOrigin.SharedMedia,
    });
  });

  const handleSelectPreviewMedia = useLastCallback((index: number) => {
    openMediaViewer({
      standaloneMedia: botPreviewMedia?.flatMap((item) => item?.content.photo
      || item?.content.video).filter(Boolean),
      origin: MediaViewerOrigin.PreviewMedia,
      mediaIndex: index,
    });
  });

  const handlePlayAudio = useLastCallback((messageId: number) => {
    openAudioPlayer({ chatId: profileId, messageId });
  });

  const handleMemberClick = useLastCallback((id: string) => {
    openChat({ id });
  });

  const handleMessageFocus = useLastCallback((message: ApiMessage) => {
    focusMessage({ chatId: message.chatId, messageId: message.id });
  });

  const handleDeleteMembersModalClose = useLastCallback(() => {
    setDeletingUserId(undefined);
  });

  useEffectWithPrevDeps(([prevHasMemberTabs]) => {
    if (prevHasMemberTabs === undefined || activeTab === 0 || prevHasMemberTabs === hasMembersTab) {
      return;
    }

    const newActiveTab = activeTab + (hasMembersTab ? 1 : -1);

    setActiveTab(Math.min(newActiveTab, tabs.length - 1));
  }, [hasMembersTab, activeTab, tabs]);

  useEffect(() => {
    if (!transitionRef.current || !IS_TOUCH_ENV) {
      return undefined;
    }

    return captureEvents(transitionRef.current, {
      selectorToPreventScroll: '.Profile',
      onSwipe: ((e, direction) => {
        if (direction === SwipeDirection.Left) {
          setActiveTab(Math.min(renderingActiveTab + 1, tabs.length - 1));
          return true;
        } else if (direction === SwipeDirection.Right) {
          setActiveTab(Math.max(0, renderingActiveTab - 1));
          return true;
        }

        return false;
      }),
    });
  }, [renderingActiveTab, tabs.length]);

  let renderingDelay;
  // @optimization Used to unparallelize rendering of message list and profile media
  if (isFirstTab) {
    renderingDelay = !isRightColumnShown ? HIDDEN_RENDER_DELAY : 0;
    // @optimization Used to delay first render of secondary tabs while animating
  } else if (!viewportIds && !botPreviewMedia) {
    renderingDelay = SLIDE_TRANSITION_DURATION;
  }
  const canRenderContent = useAsyncRendering([chatId, threadId, resultType, renderingActiveTab], renderingDelay);

  const handleChangeSchedule = useCallback(() => {}, []);

  return (
    <InfiniteScroll
      ref={containerRef}
      className="ScheduledCleaning custom-scroll"
      itemSelector={`.shared-media-transition > .Transition_slide-active.${resultType}-list > .scroll-item`}
      items={canRenderContent ? viewportIds : undefined}
      cacheBuster={cacheBuster}
      sensitiveArea={PROFILE_SENSITIVE_AREA}
      preloadBackwards={canRenderContent ? (resultType === 'members' ? MEMBERS_SLICE : SHARED_MEDIA_SLICE) : 0}
      // To prevent scroll jumps caused by reordering member list
      noScrollRestoreOnTop
      noFastList
      onLoadMore={getMore}
      onScroll={handleScroll}
    >
      <div className="describe">
        <img src={UserBlockRoundedPath} alt="UserBlockRounded" />
        <span>启用后，在此聊天中发送和接受的消息将在一段时间后被自动删除</span>
      </div>
      <RadioGroup
        name="switch-scheduling"
        options={schedulingOptions}
        onChange={handleChangeSchedule}
      />
    </InfiniteScroll>
  );
};

export default memo(withGlobal<OwnProps>(
  (global, {
    chatId, threadId, isMobile,
  }): StateProps => {
    const user = selectUser(global, chatId);
    const chat = selectChat(global, chatId);
    const chatFullInfo = selectChatFullInfo(global, chatId);
    const userFullInfo = selectUserFullInfo(global, chatId);
    const messagesById = selectChatMessages(global, chatId);

    const { currentType: mediaSearchType, resultsByType } = selectCurrentSharedMediaSearch(global) || {};
    const { foundIds } = (resultsByType && mediaSearchType && resultsByType[mediaSearchType]) || {};

    const isTopicInfo = Boolean(chat?.isForum && threadId && threadId !== MAIN_THREAD_ID);

    const { byId: usersById, statusesById: userStatusesById } = global.users;
    const { byId: chatsById } = global.chats;

    const isSavedDialog = getIsSavedDialog(chatId, threadId, global.currentUserId);

    const isGroup = chat && isChatGroup(chat);
    const isChannel = chat && isChatChannel(chat);
    const hasMembersTab = !isTopicInfo && !isSavedDialog && (isGroup || (isChannel && isChatAdmin(chat!)));
    const members = chatFullInfo?.members;
    const adminMembersById = chatFullInfo?.adminMembersById;
    const areMembersHidden = hasMembersTab && chat
      && (chat.isForbidden || (chatFullInfo && !chatFullInfo.canViewMembers));
    const canAddMembers = hasMembersTab && chat
      && (getHasAdminRight(chat, 'inviteUsers') || (!isChannel && !isUserRightBanned(chat, 'inviteUsers'))
        || chat.isCreator);
    const canDeleteMembers = hasMembersTab && chat && (getHasAdminRight(chat, 'banUsers') || chat.isCreator);
    const activeDownloads = selectActiveDownloads(global);
    const { similarChannelIds } = selectSimilarChannelIds(global, chatId) || {};
    const isCurrentUserPremium = selectIsCurrentUserPremium(global);

    const peer = user || chat;
    const peerFullInfo = userFullInfo || chatFullInfo;

    const hasCommonChatsTab = user && !user.isSelf && !isUserBot(user) && !isSavedDialog
      && Boolean(userFullInfo?.commonChatsCount);
    const commonChats = selectUserCommonChats(global, chatId);

    const hasPreviewMediaTab = userFullInfo?.botInfo?.hasPreviewMedia;
    const botPreviewMedia = global.users.previewMediaByBotId[chatId];

    const hasStoriesTab = peer && (user?.isSelf || (!peer.areStoriesHidden && peerFullInfo?.hasPinnedStories))
      && !isSavedDialog;
    const peerStories = hasStoriesTab ? selectPeerStories(global, peer.id) : undefined;
    const storyIds = peerStories?.profileIds;
    const pinnedStoryIds = peerStories?.pinnedIds;
    const storyByIds = peerStories?.byId;
    const archiveStoryIds = peerStories?.archiveIds;

    return {
      theme: selectTheme(global),
      isChannel,
      messagesById,
      foundIds,
      mediaSearchType,
      hasCommonChatsTab,
      hasStoriesTab,
      hasMembersTab,
      hasPreviewMediaTab,
      areMembersHidden,
      canAddMembers,
      canDeleteMembers,
      currentUserId: global.currentUserId,
      isRightColumnShown: selectIsRightColumnShown(global, isMobile),
      isRestricted: chat?.isRestricted,
      activeDownloads,
      usersById,
      userStatusesById,
      chatsById,
      storyIds,
      pinnedStoryIds,
      archiveStoryIds,
      storyByIds,
      isChatProtected: chat?.isProtected,
      nextProfileTab: selectTabState(global).nextProfileTab,
      forceScrollProfileTab: selectTabState(global).forceScrollProfileTab,
      shouldWarnAboutSvg: global.settings.byKey.shouldWarnAboutSvg,
      similarChannels: similarChannelIds,
      botPreviewMedia,
      isCurrentUserPremium,
      isTopicInfo,
      isSavedDialog,
      isSynced: global.isSynced,
      limitSimilarChannels: selectPremiumLimit(global, 'recommendedChannels'),
      ...(hasMembersTab && members && { members, adminMembersById }),
      ...(hasCommonChatsTab && user && { commonChatIds: commonChats?.ids }),
    };
  },
)(ScheduledCleaning));
