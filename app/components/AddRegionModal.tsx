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
        base: "rounded-2xl shadow-xl border border-white/60",
        body: "py-6",
        wrapper: "backdrop-blur-md bg-slate-900/10",
        closeButton: "hover:bg-blue-50 transition-colors"
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
          <ModalHeader className="px-8 py-5 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2.5">
              <i className="ri-add-circle-line text-blue-600"></i>
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
                <i className="ri-map-pin-line text-blue-600 flex-shrink-0"></i>
              }
              className="w-full transition-all hover:translate-y-[-2px] duration-300 group"
              classNames={{
                inputWrapper: "bg-white shadow-sm border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50/30 group-hover:shadow group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100",
                label: "text-slate-600 font-medium text-sm flex items-center gap-2.5",
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
                inputWrapper: "bg-white shadow-sm border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50/30 group-hover:shadow group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100",
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
                <i className="ri-file-text-line text-blue-500 flex-shrink-0"></i>
              }
              className="w-full transition-all hover:translate-y-[-2px] duration-300 group"
              classNames={{
                inputWrapper: "bg-white shadow-sm border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50/30 group-hover:shadow group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100 min-h-[120px]",
                label: "text-slate-700 font-medium text-sm flex items-center gap-2",
                input: "text-slate-700"
              }}
            />
          </ModalBody>
          <ModalFooter className="px-8 py-5 border-t border-slate-100 bg-slate-50/50">
            <Button 
              color="danger" 
              variant="flat" 
              onPress={onClose}
              className="font-medium min-w-[100px] bg-red-50 text-red-600 hover:bg-red-100"
            >
              Cancel
            </Button>
            <Button 
              color="primary" 
              type="submit"
              className="font-medium min-w-[100px] bg-blue-600 text-white hover:bg-blue-700"
            >
              Add Region
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
} 