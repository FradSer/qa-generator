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
              <i className="ri-add-circle-line text-blue-500"></i>
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
                <i className="ri-map-pin-line text-blue-500 flex-shrink-0"></i>
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
                <i className="ri-keyboard-line text-blue-500 flex-shrink-0"></i>
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
                <i className="ri-file-text-line text-blue-500 flex-shrink-0 mt-1.5"></i>
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
                <i className="ri-close-circle-line"></i>
                Cancel
              </span>
            </Button>
            <Button 
              color="primary" 
              type="submit"
              className="font-medium bg-gradient-to-r from-blue-500 to-blue-600 shadow-md hover:shadow-lg hover:translate-y-[-1px] transition-all duration-300 px-4"
            >
              <span className="flex items-center gap-1.5">
                <i className="ri-add-circle-line"></i>
                Add Region
              </span>
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
} 