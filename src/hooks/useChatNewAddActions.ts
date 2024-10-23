import { useMemo } from '../lib/teact/teact';
import { getActions } from '../global';

import type { MenuItemContextAction } from '../components/ui/ListItem';
import { type ApiChat, type ApiUser } from '../api/types';

import { SERVICE_NOTIFICATIONS_USER_ID } from '../config';
import {
  getCanDeleteChat, isChatArchived, isChatChannel, isChatGroup,
  isUserId,
} from '../global/helpers';
import { compact } from '../util/iteratees';
import { IS_ELECTRON, IS_OPEN_IN_NEW_TAB_SUPPORTED } from '../util/windowEnvironment';
import useOldLang from './useOldLang';

const useChatContextActions = ({
  chat,
  user,
  folderId,
  isPinned,
  isMuted,
  canChangeFolder,
  isSavedDialog,
  currentUserId,
  isPreview,
  handleDelete,
  handleMute,
  handleChatFolderChange,
  handleReport,
}: {
  chat: ApiChat | undefined;
  user: ApiUser | undefined;
  folderId?: number;
  isPinned?: boolean;
  isMuted?: boolean;
  canChangeFolder?: boolean;
  isSavedDialog?: boolean;
  currentUserId?: string;
  isPreview?: boolean;
  handleDelete?: NoneToVoidFunction;
  handleMute?: NoneToVoidFunction;
  handleChatFolderChange: NoneToVoidFunction;
  handleReport?: NoneToVoidFunction;
}) => {
  const lang = useOldLang();

  const deleteTitle = useMemo(() => {
    if (!chat) return undefined;

    if (isSavedDialog) {
      return lang('Delete');
    }

    if (isUserId(chat.id)) {
      return lang('DeleteChatUser');
    }

    if (getCanDeleteChat(chat)) {
      return lang('DeleteChat');
    }

    if (isChatChannel(chat)) {
      return lang('LeaveChannel');
    }

    return lang('Group.LeaveGroup');
  }, [chat, isSavedDialog, lang]);

  return useMemo(() => {
    if (!chat || isPreview) {
      return undefined;
    }

    const {
      toggleChatPinned,
      toggleSavedDialogPinned,
      updateChatMutedState,
      openChatInNewTab,
    } = getActions();

    const actionOpenInNewTab = IS_OPEN_IN_NEW_TAB_SUPPORTED && {
      title: IS_ELECTRON ? 'Open in new window' : 'Open in new tab',
      icon: 'open-in-new-tab',
      handler: () => {
        if (isSavedDialog) {
          openChatInNewTab({ chatId: currentUserId!, threadId: chat.id });
        } else {
          openChatInNewTab({ chatId: chat.id });
        }
      },
    };

    const togglePinned = () => {
      if (isSavedDialog) {
        toggleSavedDialogPinned({ id: chat.id });
      } else {
        toggleChatPinned({ id: chat.id, folderId: folderId! });
      }
    };

    const actionPin = isPinned
      ? {
        title: lang('UnpinFromTop'),
        icon: 'unpin',
        handler: togglePinned,
      }
      : {
        title: lang('PinToTop'),
        icon: 'pin',
        handler: togglePinned,
      };

    const actionDelete = {
      title: deleteTitle,
      icon: 'delete',
      destructive: true,
      handler: handleDelete,
    };

    if (isSavedDialog) {
      return compact([actionOpenInNewTab, actionPin, actionDelete]) as MenuItemContextAction[];
    }

    const actionAddToFolder = canChangeFolder ? {
      title: lang('ChatList.Filter.AddToFolder'),
      icon: 'folder',
      handler: handleChatFolderChange,
    } : undefined;

    const actionMute = isMuted
      ? {
        title: lang('ChatList.Unmute'),
        icon: 'unmute',
        handler: () => updateChatMutedState({ chatId: chat.id, isMuted: false }),
      }
      : {
        title: `${lang('ChatList.Mute')}...`,
        icon: 'mute',
        handler: handleMute,
      };

    return compact([
      actionDelete,
    ]) as MenuItemContextAction[];
  }, [
    chat, canChangeFolder, lang, handleChatFolderChange, isPinned, isMuted, currentUserId,
    handleDelete, handleMute, folderId, isSavedDialog, deleteTitle,
    isPreview,
  ]);
};

export default useChatContextActions;
