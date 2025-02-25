'use client';

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea
} from '@heroui/react';
import { Dispatch, SetStateAction } from 'react';
import { Region } from '../../config/config';

type AddRegionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  newRegion: Partial<Region>;
  setNewRegion: Dispatch<SetStateAction<Partial<Region>>>;
  onSubmit: (region: Partial<Region>) => Promise<void>;
};

/**
 * Modal component for adding new regions
 */
export function AddRegionModal({
  isOpen,
  onClose,
  newRegion,
  setNewRegion,
  onSubmit
}: AddRegionModalProps) {
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(newRegion);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="lg"
      classNames={{
        base: "rounded-2xl shadow-2xl border border-white/50",
        body: "py-6",
        wrapper: "backdrop-blur-md bg-slate-900/20",
        closeButton: "hover:bg-slate-200/70 transition-colors"
      }}
      backdrop="blur"
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            transition: {
              duration: 0.3,
              ease: "easeOut"
            }
          },
          exit: {
            y: -20,
            opacity: 0,
            transition: {
              duration: 0.2,
              ease: "easeIn"
            }
          }
        },
        initial: { y: -20, opacity: 0 }
      }}
    >
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader className="px-8 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-500">
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 8.25a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" clipRule="evenodd" />
              </svg>
              Add New Region
            </h3>
          </ModalHeader>
          <ModalBody className="px-8 space-y-6">
            <Input
              label="Region Name (Chinese)"
              placeholder="输入地区中文名称"
              value={newRegion.name}
              onChange={(e) => setNewRegion(prev => ({ ...prev, name: e.target.value }))}
              required
              variant="bordered"
              labelPlacement="outside"
              startContent={
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500 flex-shrink-0">
                  <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              }
              className="w-full transition-all hover:translate-y-[-2px] duration-300 group"
              classNames={{
                inputWrapper: "bg-white shadow-sm border-slate-200 group-hover:border-blue-300 group-hover:shadow group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100",
                label: "text-slate-700 font-medium text-sm flex items-center gap-2",
                input: "text-slate-700"
              }}
            />
            <Input
              label="Pinyin"
              placeholder="Enter pinyin for the region"
              value={newRegion.pinyin}
              onChange={(e) => setNewRegion(prev => ({ ...prev, pinyin: e.target.value }))}
              required
              variant="bordered"
              labelPlacement="outside"
              startContent={
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500 flex-shrink-0">
                  <path fillRule="evenodd" d="M5.337 21.718a6.707 6.707 0 01-.533-.074.75.75 0 01-.44-1.223 3.73 3.73 0 00.814-1.686c.023-.115-.022-.317-.254-.543C3.274 16.587 2.25 14.41 2.25 12c0-5.03 4.428-9 9.75-9s9.75 3.97 9.75 9c0 5.03-4.428 9-9.75 9-.833 0-1.643-.097-2.417-.279a6.721 6.721 0 01-4.246.997z" clipRule="evenodd" />
                </svg>
              }
              className="w-full transition-all hover:translate-y-[-2px] duration-300 group"
              classNames={{
                inputWrapper: "bg-white shadow-sm border-slate-200 group-hover:border-blue-300 group-hover:shadow group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100",
                label: "text-slate-700 font-medium text-sm flex items-center gap-2",
                input: "text-slate-700"
              }}
            />
            <Textarea
              label="Description"
              placeholder="Enter region description"
              value={newRegion.description}
              onChange={(e) => setNewRegion(prev => ({ ...prev, description: e.target.value }))}
              required
              variant="bordered"
              labelPlacement="outside"
              minRows={3}
              startContent={
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500 flex-shrink-0 mt-1.5">
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
              }
              className="w-full transition-all hover:translate-y-[-2px] duration-300 group"
              classNames={{
                inputWrapper: "bg-white shadow-sm border-slate-200 group-hover:border-blue-300 group-hover:shadow group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100 min-h-[120px]",
                label: "text-slate-700 font-medium text-sm flex items-center gap-2",
                input: "text-slate-700"
              }}
            />
          </ModalBody>
          <ModalFooter className="px-8 py-5 border-t border-slate-100 flex gap-3 justify-end">
            <Button
              variant="flat"
              onPress={onClose}
              className="font-medium bg-slate-100 hover:bg-slate-200 transition-all duration-300 shadow-sm hover:shadow px-4"
              type="button"
            >
              <span className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
                Cancel
              </span>
            </Button>
            <Button 
              color="primary" 
              type="submit"
              className="font-medium bg-gradient-to-r from-blue-500 to-blue-600 shadow-md hover:shadow-lg hover:translate-y-[-1px] transition-all duration-300 px-4"
            >
              <span className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                Add Region
              </span>
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
} 