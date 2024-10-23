import type { ActionReturnType } from '../../types';

import { getCurrentTabId } from '../../../util/establishMultitabRole';
import { addActionHandler } from '../../index';
import { closeNewContactDialog, updateUserSearch } from '../../reducers';
import { updateTabState } from '../../reducers/tabs';

addActionHandler('setUserSearchQuery', (global, actions, payload): ActionReturnType => {
  const {
    query,
    tabId = getCurrentTabId(),
  } = payload!;

  return updateUserSearch(global, {
    globalUserIds: undefined,
    localUserIds: undefined,
    fetchingStatus: Boolean(query),
    query,
  }, tabId);
});

addActionHandler('openNewContactDialog', (global, actions, payload): ActionReturnType => {
  const { tabId = getCurrentTabId() } = payload || {};

  // 添加好友第一步搜索
  return updateTabState(global, {
    newContact: {
      isByPhoneNumber: true,
    },
  }, tabId);
});

addActionHandler('openAddContactDialog', (global, actions, payload): ActionReturnType => {
  const { userId, tabId = getCurrentTabId() } = payload!;

  // 添加好友填写申请说明
  return updateTabState(global, {
    newContact: {
      userId,
      requirePermission: true,
    },
  }, tabId);
});

addActionHandler('closeNewContactDialog', (global, actions, payload): ActionReturnType => {
  const { tabId = getCurrentTabId() } = payload || {};

  return closeNewContactDialog(global, tabId);
});
