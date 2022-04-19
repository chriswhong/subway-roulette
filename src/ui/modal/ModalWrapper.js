import React, { Fragment } from 'react'
import PropTypes from 'prop-types'
import { Dialog, Transition } from '@headlessui/react'

import DeleteModal from './DeleteModal'

export default function ModalWrapper (modalProps) {
  const {
    visible,
    type,
    hideModal
  } = modalProps

  let modalComponent
  switch (type) {
    case 'DeleteModal':
      modalComponent = <DeleteModal {...modalProps} />
  }

  return (
    <Transition.Root show={visible} as={Fragment}>
      <Dialog as='div' className='fixed z-10 inset-0 overflow-y-auto' onClose={() => { hideModal() }}>
        <div className='flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
          <Transition.Child
            as={Fragment}
            enter='ease-out duration-300'
            enterFrom='opacity-0'
            enterTo='opacity-100'
            leave='ease-in duration-200'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'
          >
            <Dialog.Overlay className='fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity' />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span className='hidden sm:inline-block sm:align-middle sm:h-screen' aria-hidden='true'>
            &#8203;
          </span>
          {modalComponent}
        </div>
      </Dialog>
    </Transition.Root>
  )
}

ModalWrapper.propTypes = {
  visible: PropTypes.bool,
  hideModal: PropTypes.func,
  type: PropTypes.string
}
