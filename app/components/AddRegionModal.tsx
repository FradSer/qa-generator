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
      className="bg-white/95 backdrop-blur-sm border border-slate-200/70 shadow-lg rounded-2xl"
    >
      <ModalContent>
        <ModalHeader className="px-6 py-5 border-b border-slate-200/50">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2.5">
            <i className="ri-map-pin-add-line text-blue-600"></i>
            Add New Region
          </h3>
        </ModalHeader>
        <ModalBody className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Region Name"
              placeholder="Enter region name"
              value={newRegion.name}
              onChange={(e) => setNewRegion({ ...newRegion, name: e.target.value })}
              className="w-full"
              startContent={
                <i className="ri-map-pin-line text-blue-600 flex-shrink-0"></i>
              }
            />
            <Input
              label="Pinyin"
              placeholder="Enter pinyin"
              value={newRegion.pinyin}
              onChange={(e) => setNewRegion({ ...newRegion, pinyin: e.target.value })}
              className="w-full"
              startContent={
                <i className="ri-keyboard-line text-blue-500 flex-shrink-0"></i>
              }
            />
            <Textarea
              label="Description"
              placeholder="Enter region description"
              value={newRegion.description}
              onChange={(e) => setNewRegion({ ...newRegion, description: e.target.value })}
              className="w-full"
              startContent={
                <i className="ri-file-text-line text-blue-500 flex-shrink-0"></i>
              }
            />
          </form>
        </ModalBody>
        <ModalFooter className="px-6 py-4 border-t border-slate-200/50 bg-slate-50/50">
          <div className="flex justify-end gap-3">
            <Button
              variant="flat"
              onPress={onClose}
              className="px-4 py-2 rounded-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors duration-300"
            >
              Cancel
            </Button>
            <Button
              color="primary"
              type="submit"
              className="px-4 py-2 rounded-lg font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-md hover:shadow-blue-200/50 hover:translate-y-[-2px] active:translate-y-[1px] transition-all duration-300"
            >
              Add Region
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
} 