import type { FC, TeactNode } from '../../../lib/teact/teact';
import React, { memo, useMemo, useState } from '../../../lib/teact/teact';
import { withGlobal } from '../../../global';

import type { ApiUser, ApiUserStatus } from '../../../api/types';
import type { IconName } from '../../../types/icons';

import { filterUsersByName, sortUserIds } from '../../../global/helpers';

import useInfiniteScroll from '../../../hooks/useInfiniteScroll';
import useLastCallback from '../../../hooks/useLastCallback';

import PrivateChatInfo from '../../common/PrivateChatInfo';
import Button from '../../ui/Button';
import Checkbox from '../../ui/Checkbox';
import CheckboxGroup from '../../ui/CheckboxGroup';
import ListItem from '../../ui/ListItem';
import Loading from '../../ui/Loading';
import Modal from '../../ui/Modal';

import styles from './ShareFriendsModal.module.scss';

import userBlockPath from '../../../assets/nIcons/user-block.svg';

export type TableAboutData = [IconName | undefined, TeactNode, TeactNode][];

type StateProps = {
  contactIds?: string[];
  usersById: Record<string, ApiUser>;
  userStatusesById: Record<string, ApiUserStatus>;
};

type OwnProps = {
  isOpen?: boolean;
  listItemData?: TableAboutData;
  headerIconName: IconName;
  header?: TeactNode;
  footer?: TeactNode;
  buttonText?: string;
  onClose: NoneToVoidFunction;
  onButtonClick?: NoneToVoidFunction;
};

const ShareFriendsModal: FC<OwnProps & StateProps> = ({
  isOpen,
  onClose,
  usersById,
  contactIds,
  userStatusesById,
}) => {
  const filter = '';
  const listIds = useMemo(() => {
    if (!contactIds) {
      return undefined;
    }

    const filteredIds = filterUsersByName(contactIds, usersById, filter);

    return sortUserIds(filteredIds, usersById, userStatusesById);
  }, [contactIds, filter, usersById, userStatusesById]);

  const [viewportIds, getMore] = useInfiniteScroll(undefined, listIds, Boolean());

  const [chosenSpanOption, setChosenSpanOptions] = useState<string[] | undefined>(undefined);

  const handleSpanOptionChange = useLastCallback((options: string[]) => {
    setChosenSpanOptions(options);
  });

  return (
    <Modal
      isOpen={isOpen}
      className={styles.root}
      contentClassName={styles.content}
      onClose={onClose}
      title="分享到"
      hasCloseButton
      footer={(
        <div>
          <Button size="smaller" className={styles.button}>发送</Button>
        </div>
      )}
    >
      <div className={styles.title}>最近聊天</div>
      {viewportIds?.length ? (
        <CheckboxGroup
          options={viewportIds.map((id) => (
            {
              label: <PrivateChatInfo
                userId={id}
                avatarSize="medium"
                forceShowSelf
                className={styles.listItem}
              />,
              value: id,
            }
          ))}
          selected={chosenSpanOption}
          onChange={handleSpanOptionChange}
        />
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
      <div className={styles.title}>联系人</div>
      {viewportIds?.length ? (
        <CheckboxGroup
          options={viewportIds.map((id) => (
            {
              label: <PrivateChatInfo
                userId={id}
                avatarSize="medium"
                forceShowSelf
                className={styles.listItem}
              />,
              value: id,
            }
          ))}
          selected={chosenSpanOption}
          onChange={handleSpanOptionChange}
        />
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
    </Modal>
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
)(ShareFriendsModal));
