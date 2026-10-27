import { createReactBlockSpec } from '@blocknote/react';
import { galleryConfig } from './galleryItems';
import { GalleryView } from './GalleryView';

export const GalleryBlock = createReactBlockSpec(galleryConfig, { render: (props) => <GalleryView {...props} /> });
