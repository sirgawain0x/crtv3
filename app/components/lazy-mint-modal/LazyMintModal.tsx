import LazyMintForm from '../forms/LazyMintForm';
 
type LazyMintProps = {
  baseURIForToken: string;
  toggleModal: () => void;
};

export default function LazyMintModal(props: LazyMintProps) {
  return (
    <div className="fixed inset-0 h-screen overflow-y-auto bg-black bg-opacity-90">
      <div className="p relative top-96 mx-auto w-full max-w-md rounded-lg bg-white p-8 shadow dark:bg-slate-800">
        <button
          onClick={props.toggleModal}
          className="absolute right-4 top-2 text-gray-600 hover:text-gray-800 focus:outline-none dark:hover:text-gray-200"
        >
          <p className="text-lg font-semibold">&times;</p>
        </button>

        <LazyMintForm
          baseURIForToken={String(props.baseURIForToken)}
          handleToggleSwitch={props.toggleModal}
        />
      </div>
    </div>
  );
}
