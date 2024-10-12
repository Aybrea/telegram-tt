import type { FC } from '../../../lib/teact/teact';
import React, { memo, useCallback, useMemo } from '../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../global';

import type { ApiUser, ApiUserStatus } from '../../../api/types';
import { StoryViewerOrigin } from '../../../types';

import { filterUsersByName, sortUserIds } from '../../../global/helpers';

import useAppLayout from '../../../hooks/useAppLayout';
import useHistoryBack from '../../../hooks/useHistoryBack';
import useInfiniteScroll from '../../../hooks/useInfiniteScroll';
import useOldLang from '../../../hooks/useOldLang';

import PrivateChatInfo from '../../common/PrivateChatInfo';
import Button from '../../ui/Button';
import FloatingActionButton from '../../ui/FloatingActionButton';
import InfiniteScroll from '../../ui/InfiniteScroll';
import ListItem from '../../ui/ListItem';
import Loading from '../../ui/Loading';

import styles from './ContactList.module.scss';

import aiRobotPath from '../../../assets/nIcons/ai-robot.svg';
import friendApplyPath from '../../../assets/nIcons/friend-apply.svg';
import groupChatPath from '../../../assets/nIcons/group-chat.svg';

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

const ContactList: FC<OwnProps & StateProps> = ({
  isActive,
  filter,
  usersById,
  userStatusesById,
  contactIds,
  onReset,
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

  function sortList() {}

  return (
    <>
      <div className={styles.root}>
        <div>
          <Button
            ripple={!isMobile}
            round
            pill
            onClick={sortList}
            size="default"
            color="translucent"
          >
            <img src={friendApplyPath} alt="" />
          </Button>
          <span>
            {lang('NewFriend')}
          </span>
        </div>
        <div>
          <Button
            ripple={!isMobile}
            round
            pill
            onClick={sortList}
            size="default"
            color="translucent"
          >
            <img src={groupChatPath} alt="" />
          </Button>
          <span>
            {lang('GroupChat')}
          </span>
        </div>
        <div>
          <Button
            ripple={!isMobile}
            round
            pill
            onClick={sortList}
            size="default"
            color="translucent"
          >
            <img src={aiRobotPath} alt="" />
          </Button>
          <span>
            {lang('AI')}
          </span>
        </div>
      </div>
      <div className={styles.divider} />
      <InfiniteScroll items={viewportIds} onLoadMore={getMore} className="chat-list custom-scroll">
        {viewportIds?.length ? (
          viewportIds.map((id) => (
            <ListItem
              key={id}
              className="chat-item-clickable contact-list-item"
              // eslint-disable-next-line react/jsx-no-bind
              onClick={() => handleClick(id)}
            >
              <PrivateChatInfo
                userId={id}
                forceShowSelf
                avatarSize="large"
                withStory
                storyViewerOrigin={StoryViewerOrigin.ChatList}
                ripple={!isMobile}
              />
            </ListItem>
          ))
        ) : viewportIds && !viewportIds.length ? (
          <p className="no-results" key="no-results" dir="auto">
            {filter.length ? 'No contacts matched your search.' : 'Contact list is empty.'}
          </p>
        ) : (
          <Loading key="loading" />
        )}
        <FloatingActionButton
          key="create-new-contact"
          isShown
          onClick={openNewContactDialog}
          ariaLabel={lang('CreateNewContact')}
        >
          <i className="icon icon-add-user-filled" />
        </FloatingActionButton>
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
)(ContactList));
