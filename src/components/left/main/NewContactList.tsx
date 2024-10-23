import type { FC } from '../../../lib/teact/teact';
import React, { memo, useCallback, useMemo } from '../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../global';

import type { ApiUser, ApiUserStatus } from '../../../api/types';
import { StoryViewerOrigin } from '../../../types';

import { filterUsersByName, sortUserIds } from '../../../global/helpers';

import useAppLayout from '../../../hooks/useAppLayout';
import useChatNewAddActions from '../../../hooks/useChatNewAddActions';
import useHistoryBack from '../../../hooks/useHistoryBack';
import useInfiniteScroll from '../../../hooks/useInfiniteScroll';
import useOldLang from '../../../hooks/useOldLang';

import PrivateChatInfo from '../../common/PrivateChatInfo';
import Button from '../../ui/Button';
import FloatingActionButton from '../../ui/FloatingActionButton';
import InfiniteScroll from '../../ui/InfiniteScroll';
import ListItem from '../../ui/ListItem';
import Loading from '../../ui/Loading';

import styles from './NewContactList.module.scss';

import aiRobotPath from '../../../assets/nIcons/ai-robot.svg';
import friendApplyPath from '../../../assets/nIcons/friend-apply.svg';
import groupChatPath from '../../../assets/nIcons/group-chat.svg';
import userBlockPath from '../../../assets/nIcons/user-block.svg';

export type OwnProps = {
  filter: string;
  isActive: boolean;
  onReset: () => void;
};

type StateProps = {
  usersById: Record<string, ApiUser>;
  userStatusesById: Record<string, ApiUserStatus>;
  contactIds?: string[];
};

const NewContactList: FC<OwnProps & StateProps> = ({
  isActive,
  filter,
  usersById,
  userStatusesById,
  contactIds,
  onReset,
  onSwitchContactType,
}) => {
  const {
    openChat,
    openNewContactDialog,
  } = getActions();

  const lang = useOldLang();
  const { isMobile } = useAppLayout();

  useHistoryBack({
    isActive,
    onBack: onReset,
  });

  const handleClick = useCallback((id: string) => {
    openChat({ id, shouldReplaceHistory: true });
  }, [openChat]);

  const listIds = useMemo(() => {
    if (!contactIds) {
      return undefined;
    }

    const filteredIds = filterUsersByName(contactIds, usersById, filter);

    return sortUserIds(filteredIds, usersById, userStatusesById);
  }, [contactIds, filter, usersById, userStatusesById]);

  const [viewportIds, getMore] = useInfiniteScroll(undefined, listIds, Boolean(filter));

  const contextActions = useChatNewAddActions({
  });

  return (
    <>
      <div className={styles.root}>
        新的朋友
      </div>
      <InfiniteScroll items={viewportIds} onLoadMore={getMore} className="chat-list custom-scroll">
        <div>待处理</div>
        {viewportIds?.length ? (
          viewportIds.map((id) => (
            <ListItem
              key={id}
              className="chat-item-clickable contact-list-item"
              contextActions={contextActions}
            >
              <PrivateChatInfo
                userId={id}
                forceShowSelf
                avatarSize="large"
                withStory
                storyViewerOrigin={StoryViewerOrigin.ChatList}
                ripple={!isMobile}
              />
              <div>
                <Button pill size="tiny">验证</Button>
              </div>
            </ListItem>
          ))
        ) : viewportIds && !viewportIds.length ? (
          <div className={styles.emptyUser}>
            <div>
              <img src={userBlockPath} alt="" />
            </div>
            <p className="no-results" key="no-results" dir="auto">
              {filter.length ? '没有匹配的联系人' : '没有联系人'}
            </p>
          </div>
        ) : (
          <Loading key="loading" />
        )}
        <div>已处理</div>
        {viewportIds?.length ? (
          viewportIds.map((id) => (
            <ListItem
              key={id}
              className="chat-item-clickable contact-list-item"
            >
              <PrivateChatInfo
                userId={id}
                forceShowSelf
                avatarSize="large"
                withStory
                storyViewerOrigin={StoryViewerOrigin.ChatList}
                ripple={!isMobile}
              />
              <div>
                已添加
              </div>
            </ListItem>
          ))
        ) : viewportIds && !viewportIds.length ? (
          <div className={styles.emptyUser}>
            <div>
              <img src={userBlockPath} alt="" />
            </div>
            <p className="no-results" key="no-results" dir="auto">
              {filter.length ? '没有匹配的联系人' : '没有联系人'}
            </p>
          </div>
        ) : (
          <Loading key="loading" />
        )}
      </InfiniteScroll>
    </>
  );
};

export default memo(withGlobal<OwnProps>(
  (global): StateProps => {
    const { userIds: contactIds } = global.contactList || {};
    const { byId: usersById, statusesById: userStatusesById } = global.users;

    return {
      usersById,
      userStatusesById,
      contactIds,
    };
  },
)(NewContactList));
