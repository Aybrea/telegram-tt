import type { ChangeEvent } from 'react';
import type { FC, TeactNode } from '../../lib/teact/teact';
import React, {
  memo, useCallback, useRef, useState,
} from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { ApiUser } from '../../api/types';
import type { TextPart } from '../../types';

import { selectUser } from '../../global/selectors';
import buildClassName from '../../util/buildClassName';

import useKeyboardListNavigation from '../../hooks/useKeyboardListNavigation';
import useOldLang from '../../hooks/useOldLang';

import Button from './Button';
import InputText from './InputText';
import Modal from './Modal';

type OwnProps = {
  userId: string;
  isOpen: boolean;
  title?: string;
  header?: TeactNode;
  textParts?: TextPart;
  text?: string;
  confirmLabel?: string;
  confirmIsDestructive?: boolean;
  isConfirmDisabled?: boolean;
  isOnlyConfirm?: boolean;
  areButtonsInColumn?: boolean;
  className?: string;
  children?: React.ReactNode;
  confirmHandler: NoneToVoidFunction;
  onClose: NoneToVoidFunction;
  onCloseAnimationEnd?: NoneToVoidFunction;
};

type StateProps = {
  user?: ApiUser;
};
const ERROR_FIRST_NAME_MISSING = 'Please provide first name';

const AnnotationDialog: FC<OwnProps & StateProps> = ({
  userId,
  user,
  isOpen,
  title,
  header,
  confirmLabel = '确认',
  confirmIsDestructive,
  isConfirmDisabled,
  isOnlyConfirm,
  areButtonsInColumn,
  className,
  confirmHandler,
  onClose,
  onCloseAnimationEnd,
}) => {
  const {
    updateContact,
  } = getActions();

  const lang = useOldLang();

  // eslint-disable-next-line no-null/no-null
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLastName = user ? (user.lastName || '') : '';
  const [lastName, setLastName] = useState(currentLastName);
  const [error, setError] = useState<string | undefined>();

  const handleSelectWithEnter = useCallback((index: number) => {
    if (index === -1) confirmHandler();
  }, [confirmHandler]);

  const handleKeyDown = useKeyboardListNavigation(containerRef, isOpen, handleSelectWithEnter, '.Button');

  const handleLastNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setLastName(e.target.value);

    if (error === ERROR_FIRST_NAME_MISSING) {
      setError(undefined);
    }
  }, [error]);

  const handleProfileSave = useCallback(() => {
    const trimmedLastName = lastName.trim();

    if (!trimmedLastName.length) {
      setError(ERROR_FIRST_NAME_MISSING);
      return;
    }

    updateContact({
      userId,
      firstName: user?.firstName || '',
      lastName: trimmedLastName,
    });
    onClose();
  }, [user, lastName, updateContact, onClose, userId]);

  return (
    <Modal
      className={buildClassName('confirm', className)}
      title={title || '修改备注'}
      header={header}
      isOpen={isOpen}
      onClose={onClose}
      onCloseAnimationEnd={onCloseAnimationEnd}
    >
      <InputText
        id="user-first-name"
        label={lang('UserInfo.LastNamePlaceholder')}
        onChange={handleLastNameChange}
        value={lastName}
        error={error === ERROR_FIRST_NAME_MISSING ? error : undefined}
      />
      <div
        className={areButtonsInColumn ? 'dialog-buttons-column' : 'dialog-buttons mt-2'}
        ref={containerRef}
        onKeyDown={handleKeyDown}
      >
        <Button
          className="confirm-dialog-button"
          isText
          onClick={handleProfileSave}
          color={confirmIsDestructive ? 'danger' : 'primary'}
          disabled={isConfirmDisabled}
        >
          {confirmLabel}
        </Button>
        {!isOnlyConfirm
          && <Button className="confirm-dialog-button" color="gray" isText onClick={onClose}>{lang('Cancel')}</Button>}
      </div>
    </Modal>
  );
};

export default memo(withGlobal<OwnProps>(
  (global, { userId }): StateProps => {
    const user = selectUser(global, userId);

    return {
      user,
    };
  },
)(AnnotationDialog));
