import type { FC } from '../../../lib/teact/teact';
import React, { memo, useCallback } from '../../../lib/teact/teact';
import { withGlobal } from '../../../global';

import type { ApiChatFolder, ApiSticker } from '../../../api/types';
import type { FolderEditDispatch } from '../../../hooks/reducers/useFoldersReducer';
import { SettingsScreens } from '../../../types';

import { selectAnimatedEmoji, selectChatFolder } from '../../../global/selectors';
import { LeftMainContext } from '../../../provider/context';

import useContext from '../../../hooks/data/useContext';
import useAppLayout from '../../../hooks/useAppLayout';
import useOldLang from '../../../hooks/useOldLang';

import AnimatedIconFromSticker from '../../common/AnimatedIconFromSticker';
import Button from '../../ui/Button';

import styles from './EmptyFolder.module.scss';

type OwnProps = {
  folderId?: number;
  folderType: 'all' | 'archived' | 'saved' | 'folder';
  foldersDispatch: FolderEditDispatch;
  onSettingsScreenSelect: (screen: SettingsScreens) => void;
};

type StateProps = {
  chatFolder?: ApiChatFolder;
  animatedEmoji?: ApiSticker;
};

const ICON_SIZE = 96;

const EmptyFolder: FC<OwnProps & StateProps> = ({
  chatFolder, animatedEmoji, foldersDispatch, onSettingsScreenSelect,
}) => {
  const { handleSelectContacts } = useContext(LeftMainContext);
  const lang = useOldLang();
  const { isMobile } = useAppLayout();

  const handleEditFolder = useCallback(() => {
    foldersDispatch({ type: 'editFolder', payload: chatFolder });
    onSettingsScreenSelect(SettingsScreens.FoldersEditFolderFromChatList);
  }, [chatFolder, foldersDispatch, onSettingsScreenSelect]);

  return (
    <div className={styles.root}>
      <div className={styles.sticker}>
        {animatedEmoji && <AnimatedIconFromSticker sticker={animatedEmoji} size={ICON_SIZE} />}
      </div>
      <p className={styles.description} dir="auto">
        {lang(chatFolder ? 'ChatList.EmptyChatListFilterText' : 'Chat.EmptyChat')}
      </p>
      <Button
        ripple={!isMobile}
        fluid
        pill
        onClick={handleSelectContacts}
        size="tiny"
        color="translucent"
        isRtl={lang.isRtl}
      >
        <div className={styles.buttonText}>
          {lang('ChatList.EmptyChatListToStart')}
        </div>
      </Button>
      {chatFolder && (
        <Button
          ripple={!isMobile}
          fluid
          pill
          onClick={handleEditFolder}
          size="smaller"
          isRtl={lang.isRtl}
        >
          <i className="icon icon-settings" />
          <div className={styles.buttonText}>
            {lang('ChatList.EmptyChatListEditFilter')}
          </div>
        </Button>
      )}
    </div>
  );
};

export default memo(withGlobal<OwnProps>((global, { folderId, folderType }): StateProps => {
  const chatFolder = folderId && folderType === 'folder' ? selectChatFolder(global, folderId) : undefined;

  return {
    chatFolder,
    animatedEmoji: selectAnimatedEmoji(global, '📂'),
  };
})(EmptyFolder));
