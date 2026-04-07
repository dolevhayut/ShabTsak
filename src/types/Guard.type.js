import PropTypes from 'prop-types';

const GuardType = PropTypes.shape({
    name: PropTypes.string.isRequired,
    id: PropTypes.number.isRequired,
    mail: PropTypes.string.isRequired,
    phone: PropTypes.string.isRequired,
    color: PropTypes.string,
    shouldBeAllocated: PropTypes.bool.isRequired,
})

export default GuardType;